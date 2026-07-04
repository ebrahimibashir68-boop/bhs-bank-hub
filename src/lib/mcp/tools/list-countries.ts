import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { COUNTRIES } from "@/lib/banking";

export default defineTool({
  name: "list_countries",
  title: "List supported countries",
  description:
    "Returns the countries Pi Bank supports along with their currency, central bank, and payment rails.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const rows = Object.values(COUNTRIES).map((c) => ({
      code: c.code,
      name: c.name,
      currency: c.currency,
      centralBank: c.centralBank,
      rails: c.rails,
      intlRails: c.intlRails,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { countries: rows },
    };
  },
});
