import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { COUNTRIES, type CountryCode } from "@/lib/banking";

const CODES = ["US", "GB", "EU", "NG", "IN", "AE"] as const;

export default defineTool({
  name: "get_country_regulation",
  title: "Get country regulation details",
  description:
    "Returns central bank, KYC requirements, transaction limits, and AML notes for a supported country.",
  inputSchema: {
    country: z.enum(CODES).describe("ISO-style country code supported by Pi Bank."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ country }) => {
    const c = COUNTRIES[country as CountryCode];
    const data = {
      code: c.code,
      name: c.name,
      currency: c.currency,
      centralBank: c.centralBank,
      singleTxnLimit: c.singleTxnLimit,
      dailyLimit: c.dailyLimit,
      reportingThreshold: c.reportingThreshold,
      kycRequired: c.kycRequired,
      amlNotes: c.amlNotes,
      rails: c.rails,
      intlRails: c.intlRails,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
});
