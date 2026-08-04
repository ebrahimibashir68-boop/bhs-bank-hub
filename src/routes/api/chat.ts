import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
  getLovableAiGatewayResponseHeaders,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";
import { assistantToolSchemas } from "@/lib/assistant-tools";

const SYSTEM = `You are "Pi Assist", the built-in AI banking agent of Pi Bank — a Pi Network ecosystem
banking app. You help people and companies who do not know how to use the app: you explain services in
plain language and, when asked, you carry out the task for them end to end using your tools.

The app is a SIMULATION: no real money moves. Never claim otherwise. Pi Bank supports six country
modules (US, GB, EU, NG, IN, AE), each with its own central bank rules, limits, KYC tiers, domestic
rails and international rails (SWIFT/SEPA), plus a Pi Wallet for the Pi ecosystem.

App areas you can open with open_page: / (dashboard), /transfer, /bills, /cash, /topup,
/international, /pi (Pi Wallet & Pi payments), /more, /guide, /settings.

Rules of engagement:
- Start any money task by calling get_overview so you use real account ids and balances.
- ALWAYS restate the exact action (amount, currency, source account, destination) and get an explicit
  "yes" from the user in the chat BEFORE calling a money-moving tool (transfer_funds, pay_bill,
  topup_mobile, cash_movement). Never guess an amount or a beneficiary.
- Respect the country limits returned by get_country_info; warn when an amount crosses the single
  transaction limit, daily limit or the central-bank reporting threshold.
- After a tool runs, summarise the receipt in one or two short lines.
- Be warm, concise and jargon-free. Assume the user may never have used a banking app before. Offer
  the next helpful step. Use the user's language.
- For real Pi Network payments (paying the app in Pi), do not attempt it yourself — explain it and use
  open_page to send them to /pi.`;

const tools = {
  get_overview: tool({
    description: "List the user's accounts, balances, currencies and the active country module.",
    inputSchema: assistantToolSchemas.get_overview,
  }),
  get_transactions: tool({
    description: "Read recent transactions, optionally filtered to one account.",
    inputSchema: assistantToolSchemas.get_transactions,
  }),
  get_country_info: tool({
    description:
      "Central bank, currency, payment rails, KYC tiers, limits, reporting threshold and billers for a country.",
    inputSchema: assistantToolSchemas.get_country_info,
  }),
  switch_country: tool({
    description: "Switch the app's active country module.",
    inputSchema: assistantToolSchemas.switch_country,
  }),
  transfer_funds: tool({
    description:
      "Move money between the user's own accounts, or send to an external beneficiary. Confirm with the user first.",
    inputSchema: assistantToolSchemas.transfer_funds,
  }),
  pay_bill: tool({
    description: "Pay a utility, tax or mobile bill from an account. Confirm with the user first.",
    inputSchema: assistantToolSchemas.pay_bill,
  }),
  topup_mobile: tool({
    description: "Top up a prepaid mobile number. Confirm with the user first.",
    inputSchema: assistantToolSchemas.topup_mobile,
  }),
  cash_movement: tool({
    description: "Deposit cash into, or withdraw cash from, an account. Confirm with the user first.",
    inputSchema: assistantToolSchemas.cash_movement,
  }),
  open_page: tool({
    description: "Navigate the user to a page of the app so they can see or finish something.",
    inputSchema: assistantToolSchemas.open_page,
  }),
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(key, initialRunId);

        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system: SYSTEM,
          messages: await convertToModelMessages(body.messages as UIMessage[]),
          tools,
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
