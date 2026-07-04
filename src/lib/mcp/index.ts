import { defineMcp } from "@lovable.dev/mcp-js";
import listCountries from "./tools/list-countries";
import getCountryRegulation from "./tools/get-country-regulation";
import listBillers from "./tools/list-billers";

export default defineMcp({
  name: "pi-bank-mcp",
  title: "Pi Bank MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for Pi Bank: list supported countries, look up per-country central-bank regulation and limits, and list utility billers per country.",
  tools: [listCountries, getCountryRegulation, listBillers],
});
