import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Pi resolves ${NAME} header values from the environment when it connects.
function environmentReference(name: string): string {
  return `\${${name}}`;
}

// The web-search skill calls these vendor MCP servers from codemode scripts,
// which filter large results before they reach the conversation. Each server is
// hidden except for the one tool the skill uses, so tools a vendor adds later
// stay unreachable, including Perplexity's per-token Agent API tools.
export default function webSearch(pi: ExtensionAPI): void {
  pi.registerMcpServer("perplexity", {
    description: "Web search through the Perplexity Search API",
    exposure: "hidden",
    headers: { Authorization: `Bearer ${environmentReference("PERPLEXITY_API_KEY")}` },
    toolExposure: { perplexity_search: "codemode" },
    url: "https://api.perplexity.ai/mcp",
  });

  pi.registerMcpServer("exa", {
    description: "Read known URLs as Markdown through Exa",
    exposure: "hidden",
    headers: { "x-api-key": environmentReference("EXA_API_KEY") },
    toolExposure: { web_fetch_exa: "codemode" },
    url: "https://mcp.exa.ai/mcp",
  });
}
