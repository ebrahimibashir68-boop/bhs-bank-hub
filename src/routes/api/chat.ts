import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
  getLovableAiGatewayResponseHeaders,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";
import { assistantToolSchemas, type AssistantToolName } from "@/lib/assistant-tools";
import { resolveAgent } from "@/lib/agents";

const DESCRIPTIONS: Record<AssistantToolName, string> = {
  get_overview: "List the user's accounts, balances, currencies and the active country module.",
  get_transactions: "Read recent transactions, optionally filtered to one account.",
  get_country_info:
    "Central bank, currency, payment rails, KYC tiers, limits, reporting threshold and billers for a country.",
  switch_country: "Switch the app's active country module.",
  transfer_funds:
    "Move money between the user's own accounts, or send to an external beneficiary. Confirm with the user first.",
  pay_bill: "Pay a utility, tax or mobile bill from an account. Confirm with the user first.",
  topup_mobile: "Top up a prepaid mobile number. Confirm with the user first.",
  cash_movement: "Deposit cash into, or withdraw cash from, an account. Confirm with the user first.",
  open_page: "Navigate the user to a page of the app so they can see or finish something.",
};

function toolsFor(names: AssistantToolName[]) {
  return Object.fromEntries(
    names.map((name) => [
      name,
      tool({ description: DESCRIPTIONS[name], inputSchema: assistantToolSchemas[name] }),
    ]),
  );
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown; agent?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const agent = resolveAgent(body.agent);
        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(key, initialRunId);

        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system: agent.system,
          messages: await convertToModelMessages(body.messages as UIMessage[]),
          tools: toolsFor(agent.tools),
          stopWhen: stepCountIs(50),
        });

        const response = result.toUIMessageStreamResponse({
          originalMessages: body.messages as UIMessage[],
          headers: getLovableAiGatewayResponseHeaders(undefined, {
            ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
          }),
        });

        return withLovableAiGatewayRunIdHeader(response, gateway);
      },
    },
  },
});

