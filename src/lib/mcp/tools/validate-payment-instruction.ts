import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  BANK_IDENTITY,
  messageTypeForRail,
  validateAccountIdentifier,
  validateBic,
} from "@/lib/iso20022";
import { type CountryCode } from "@/lib/banking";

const CODES = ["US", "GB", "EU", "NG", "IN", "AE"] as const;

export default defineTool({
  name: "validate_payment_instruction",
  title: "Validate a payment instruction against SWIFT / ISO 20022 rules",
  description:
    "Validates a beneficiary account identifier (IBAN mod-97-10 or national format) and BIC (ISO 9362) for a destination country, and reports the ISO 20022 / MT message type, clearing system and correspondent bank that would be used.",
  inputSchema: {
    country: z.enum(CODES).describe("Destination country supported by Pi Bank."),
    account: z.string().describe("Beneficiary IBAN or national account number."),
    bic: z.string().optional().describe("Beneficiary bank BIC (ISO 9362)."),
    rail: z.string().optional().describe("Payment rail, e.g. SWIFT, SEPA, UPI, FedNow."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ country, account, bic, rail }) => {
    const cc = country as CountryCode;
    const identity = BANK_IDENTITY[cc];
    const accountCheck = validateAccountIdentifier(cc, account);
    const bicCheck = bic ? validateBic(bic) : undefined;
    const message = messageTypeForRail(rail ?? (identity.ibanPrefix ? "SEPA" : "SWIFT"));
    const result = {
      country: cc,
      account: { value: account, ...accountCheck, scheme: identity.ibanPrefix ? "IBAN (ISO 13616)" : "National account number" },
      bic: bicCheck ? { value: bic, ...bicCheck } : null,
      message,
      clearingSystem: identity.clearingSystem,
      memberId: { label: identity.memberIdLabel, value: identity.memberId },
      correspondentBic: identity.correspondentBic,
      settlementMethod: identity.settlementMethod,
      settlementDays: identity.settlementDays,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
