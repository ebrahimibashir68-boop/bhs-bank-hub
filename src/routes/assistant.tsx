import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
  type ToolUIPart,
  type DynamicToolUIPart,
} from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell, PageHeader, SimBanner } from "@/components/AppShell";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useBank } from "@/lib/store";
import { COUNTRIES, formatMoney, type CountryCode } from "@/lib/banking";
import assistantLogo from "@/assets/pi-assist.png";
import { AGENTS, AGENT_IDS, type AgentId } from "@/lib/agents";
import { RotateCcw } from "lucide-react";


export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Pi Assist — AI Banking Agent | Pi Bank" },
      {
        name: "description",
        content:
          "Pi Assist is Pi Bank's AI agent: it explains every service and performs transfers, bill payments, top-ups and deposits for you across six country modules.",
      },
      { property: "og:title", content: "Pi Assist — AI Banking Agent" },
      {
        property: "og:description",
        content: "Let an AI agent run your banking tasks inside the Pi ecosystem — in plain language.",
      },
      { property: "og:url", content: "https://bhs-bank-hub.lovable.app/assistant" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://bhs-bank-hub.lovable.app/assistant" }],
  }),
  component: AssistantPage,
});

const STORAGE_PREFIX = "pi-assist-conversation-v1";
const AGENT_KEY = "pi-assist-agent-v1";

function storageKey(agent: AgentId) {
  return agent === "pi-assist" ? STORAGE_PREFIX : `${STORAGE_PREFIX}:${agent}`;
}

function loadMessages(agent: AgentId): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(agent));
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

function loadAgent(): AgentId {
  if (typeof window === "undefined") return "pi-assist";
  const saved = window.localStorage.getItem(AGENT_KEY);
  return (AGENT_IDS as readonly string[]).includes(saved ?? "") ? (saved as AgentId) : "pi-assist";
}

type ToolPart = ToolUIPart | DynamicToolUIPart;

function AssistantPage() {
  const navigate = useNavigate();
  const [agentId, setAgentId] = useState<AgentId>(() => loadAgent());
  const agent = AGENTS[agentId];
  const [initialByAgent] = useState<Record<string, UIMessage[]>>(() =>
    Object.fromEntries(AGENT_IDS.map((id) => [id, loadMessages(id)])),
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { agent: agentId },
      }),
    [agentId],
  );


  const runTool = useCallback(
    (name: string, input: Record<string, unknown>) => {
      const s = useBank.getState();
      const country = COUNTRIES[s.activeCountry];
      const account = (id: unknown) => s.accounts.find((a) => a.id === id);

      switch (name) {
        case "get_overview":
          return {
            activeCountry: s.activeCountry,
            centralBank: country.centralBank,
            currency: country.currency,
            accounts: s.accounts.map((a) => ({
              id: a.id,
              name: a.name,
              type: a.type,
              country: a.country,
              number: a.number,
              balance: a.balance,
              currency: a.currency,
            })),
          };

        case "get_transactions": {
          const limit = typeof input.limit === "number" ? input.limit : 10;
          const list = s.txns
            .filter((t) => (input.accountId ? t.accountId === input.accountId : true))
            .slice(0, Math.min(Math.max(limit, 1), 50));
          return { transactions: list };
        }

        case "get_country_info": {
          const c = COUNTRIES[input.country as CountryCode];
          return {
            code: c.code,
            name: c.name,
            currency: c.currency,
            centralBank: c.centralBank,
            domesticRails: c.rails,
            internationalRails: c.intlRails,
            singleTxnLimit: c.singleTxnLimit,
            dailyLimit: c.dailyLimit,
            kycRequired: c.kycRequired,
            reportingThreshold: c.reportingThreshold,
            amlNotes: c.amlNotes,
            billers: c.billers,
          };
        }

        case "switch_country": {
          s.setActiveCountry(input.country as CountryCode);
          return { ok: true, activeCountry: input.country };
        }

        case "transfer_funds": {
          const from = account(input.fromAccountId);
          if (!from) return { ok: false, error: "Unknown source account." };
          const amount = Number(input.amount);
          if (amount > from.balance) {
            return { ok: false, error: `Insufficient funds: balance is ${formatMoney(from.balance, from.currency)}.` };
          }
          const to = input.toAccountId ? account(input.toAccountId) : undefined;
          const payee = to ? to.name : ((input.beneficiary as string) ?? "Beneficiary");
          s.adjustBalance(from.id, -amount);
          s.addTxn({
            accountId: from.id,
            description: `Transfer to ${payee}${input.note ? ` — ${input.note}` : ""}`,
            category: "Transfer",
            amount: -amount,
            currency: from.currency,
            channel: "Pi Assist",
          });
          if (to) {
            s.adjustBalance(to.id, amount);
            s.addTxn({
              accountId: to.id,
              description: `Transfer from ${from.name}`,
              category: "Transfer",
              amount,
              currency: to.currency,
              channel: "Pi Assist",
            });
          }
          return {
            ok: true,
            receipt: `${formatMoney(amount, from.currency)} sent from ${from.name} to ${payee}`,
            newBalance: useBank.getState().accounts.find((a) => a.id === from.id)?.balance,
          };
        }

        case "pay_bill": {
          const acc = account(input.accountId);
          if (!acc) return { ok: false, error: "Unknown account." };
          const biller = Object.values(COUNTRIES)
            .flatMap((c) => c.billers)
            .find((b) => b.id === input.billerId);
          if (!biller) return { ok: false, error: "Unknown biller id." };
          const amount = Number(input.amount);
          if (amount > acc.balance) return { ok: false, error: "Insufficient funds." };
          s.adjustBalance(acc.id, -amount);
          s.addTxn({
            accountId: acc.id,
            description: `${biller.name} bill`,
            category: "Utilities",
            amount: -amount,
            currency: acc.currency,
            channel: "Bill Pay",
          });
          return { ok: true, receipt: `Paid ${formatMoney(amount, acc.currency)} to ${biller.name}` };
        }

        case "topup_mobile": {
          const acc = account(input.accountId);
          if (!acc) return { ok: false, error: "Unknown account." };
          const amount = Number(input.amount);
          if (amount > acc.balance) return { ok: false, error: "Insufficient funds." };
          s.adjustBalance(acc.id, -amount);
          s.addTxn({
            accountId: acc.id,
            description: `Mobile top-up ${input.phone}`,
            category: "Mobile",
            amount: -amount,
            currency: acc.currency,
            channel: "Top-up",
          });
          return { ok: true, receipt: `Topped up ${input.phone} with ${formatMoney(amount, acc.currency)}` };
        }

        case "cash_movement": {
          const acc = account(input.accountId);
          if (!acc) return { ok: false, error: "Unknown account." };
          const amount = Number(input.amount);
          const withdraw = input.direction === "withdraw";
          if (withdraw && amount > acc.balance) return { ok: false, error: "Insufficient funds." };
          s.adjustBalance(acc.id, withdraw ? -amount : amount);
          s.addTxn({
            accountId: acc.id,
            description: withdraw ? "Cash withdrawal" : "Cash deposit",
            category: "Cash",
            amount: withdraw ? -amount : amount,
            currency: acc.currency,
            channel: "Branch/ATM",
          });
          const threshold = COUNTRIES[acc.country].reportingThreshold;
          return {
            ok: true,
            receipt: `${withdraw ? "Withdrew" : "Deposited"} ${formatMoney(amount, acc.currency)}`,
            reportFiled: amount >= threshold,
          };
        }

        case "open_page": {
          void navigate({ to: input.path as string });
          return { ok: true, opened: input.path };
        }

        default:
          return { ok: false, error: `Unknown tool ${name}` };
      }
    },
    [navigate],
  );

  const { messages, sendMessage, status, addToolResult, setMessages } = useChat({
    id: agentId,
    messages: initialByAgent[agentId] ?? [],
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: ({ toolCall }) => {
      let output: unknown;
      try {
        output = runTool(toolCall.toolName, (toolCall.input ?? {}) as Record<string, unknown>);
      } catch (error) {
        output = { ok: false, error: (error as Error).message };
      }
      void addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output,
      });
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(AGENT_KEY, agentId);
      window.localStorage.setItem(storageKey(agentId), JSON.stringify(messages));
    } catch {
      // storage full or unavailable — conversation stays in memory
    }
  }, [messages, agentId]);


  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  const submit = (message: PromptInputMessage) => {
    const text = message.text?.trim();
    if (!text || busy) return;
    void sendMessage({ text });
  };

  const ask = (text: string) => {
    if (busy) return;
    void sendMessage({ text });
  };

  return (
    <AppShell>
      <PageHeader
        title="AI Bots"
        subtitle="Three agents that run the app's services for you"
        right={
          <button
            onClick={() => {
              setMessages([]);
              try {
                window.localStorage.removeItem(storageKey(agentId));
              } catch {
                /* ignore */
              }
            }}
            aria-label="Start a new conversation"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-primary"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        }
      />
      <SimBanner />

      <div className="mx-5 mb-3 grid grid-cols-3 gap-2" role="tablist" aria-label="Choose an AI bot">
        {AGENT_IDS.map((id) => {
          const a = AGENTS[id];
          const active = id === agentId;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setAgentId(id)}
              className={`rounded-2xl border p-2 text-left transition ${
                active
                  ? "border-transparent text-primary-foreground shadow-lift"
                  : "border-border bg-card text-foreground hover:border-primary"
              }`}
            >
              <span
                className={`block rounded-xl bg-gradient-to-br px-2 py-2 ${a.accent} ${
                  active ? "" : "bg-none"
                }`}
              >
                <span className="block text-[12px] font-semibold leading-tight">{a.name}</span>
                <span
                  className={`mt-0.5 block text-[10px] leading-tight ${
                    active ? "opacity-90" : "text-muted-foreground"
                  }`}
                >
                  {a.tagline}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mx-5 flex h-[calc(100vh-19rem)] min-h-[24rem] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
        <Conversation className="flex-1">
          <ConversationContent className="gap-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                <img
                  src={assistantLogo}
                  alt={`${agent.name} agent mark`}
                  width={72}
                  height={72}
                  loading="lazy"
                  className="h-18 w-18"
                />
                <h2 className="text-base font-semibold">Hi, I'm {agent.name}</h2>
                <p className="max-w-xs text-xs text-muted-foreground">{agent.blurb}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {agent.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-medium transition hover:border-primary hover:text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}



            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return message.role === "assistant" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : (
                        <span key={i}>{part.text}</span>
                      );
                    }
                    if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
                      const toolPart = part as ToolPart;
                      const label =
                        toolPart.type === "dynamic-tool"
                          ? toolPart.toolName
                          : toolPart.type.replace("tool-", "");
                      return (
                        <Tool defaultOpen={false} key={i}>
                          <ToolHeader type={`tool-${label}`} state={toolPart.state} />
                          <ToolContent>
                            <ToolInput input={toolPart.input} />
                            <ToolOutput
                              output={
                                toolPart.state === "output-available" ? (
                                  <pre className="overflow-x-auto text-[11px]">
                                    {JSON.stringify(toolPart.output, null, 2)}
                                  </pre>
                                ) : undefined
                              }
                              errorText={
                                toolPart.state === "output-error" ? toolPart.errorText : undefined
                              }
                            />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))}

            {status === "submitted" ? (
              <Shimmer className="px-1 text-sm">Thinking…</Shimmer>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-border p-3">
          <PromptInput onSubmit={submit}>
            <PromptInputTextarea
              ref={textareaRef}
              autoFocus
              placeholder="Ask Pi Assist to pay a bill, send money, or explain anything…"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={busy} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>

      <p className="mx-5 mt-3 text-[11px] text-muted-foreground">
        Pi Assist confirms every money movement with you before it acts. All activity is simulated.
      </p>
    </AppShell>
  );
}
