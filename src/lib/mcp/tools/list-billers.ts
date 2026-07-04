import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { COUNTRIES, type CountryCode } from "@/lib/banking";

const CODES = ["US", "GB", "EU", "NG", "IN", "AE"] as const;

export default defineTool({
  name: "list_billers",
  title: "List billers for a country",
  description:
    "Returns the utility/tax billers available for bill payment in the given country.",
  inputSchema: {
    country: z.enum(CODES).describe("ISO-style country code supported by Pi Bank."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ country }) => {
    const billers = COUNTRIES[country as CountryCode].billers;
    return {
      content: [{ type: "text", text: JSON.stringify(billers, null, 2) }],
      structuredContent: { billers },
    };
  },
});
