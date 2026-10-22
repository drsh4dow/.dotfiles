import type {
  ExtensionAPI,
  NormalizedBuildSystemPromptOptions,
} from "@earendil-works/pi-coding-agent";

// Pi drops its <tools> and <rules> sections when a custom prompt replaces the preamble.
// this restores them with the stock wording; pi does not export its builder, so these mirror it.
const TOOLS_FOOTER =
  "In addition to the tools above, you may have access to other custom tools depending on the project.";

const CLOSING_RULES = [
  "Be concise in your responses",
  "Show file paths clearly when working with files",
];

const FILE_OPERATION_TOOLS = ["grep", "find", "ls"];

function fileOperationRules(tools: readonly string[]): string[] {
  const bash = tools.includes("bash");
  const powershell = tools.includes("powershell");

  if ((!bash && !powershell) || FILE_OPERATION_TOOLS.some((name) => tools.includes(name))) {
    return [];
  }

  if (bash && powershell) {
    return [
      "Use bash or PowerShell for file operations like listing, searching, and finding files",
    ];
  }

  return [
    powershell
      ? "Use PowerShell for file operations like listing, searching, and finding files"
      : "Use bash for file operations like ls, rg, find",
  ];
}

function toolsSection(
  options: NormalizedBuildSystemPromptOptions,
  tools: readonly string[],
): string {
  const lines = tools.flatMap((name) => {
    const snippet = options.toolSnippets[name];

    return snippet === undefined || snippet === "" ? [] : [`- ${name}: ${snippet}`];
  });

  return `${lines.length > 0 ? lines.join("\n") : "(none)"}\n\n${TOOLS_FOOTER}`;
}

function rulesSection(
  options: NormalizedBuildSystemPromptOptions,
  tools: readonly string[],
): string {
  const rules = [
    ...fileOperationRules(tools),
    ...tools.flatMap((name) => options.toolGuidelines[name] ?? []),
    ...options.promptGuidelines,
    ...CLOSING_RULES,
  ];

  return [
    ...new Set(
      rules
        .values()
        .map((rule) => rule.trim())
        .filter(Boolean),
    ),
  ]
    .map((rule) => `- ${rule}`)
    .join("\n");
}

export default function promptContextExtension(pi: ExtensionAPI): void {
  pi.on("before_agent_start", ({ systemPromptOptions: options }) => {
    // Pi treats an empty custom prompt as absent.
    if (options.customPrompt === undefined || options.customPrompt === "") {
      return;
    }

    const tools = options.selectedTools.filter((name) => !options.hiddenTools.includes(name));

    options.sections.tools = toolsSection(options, tools);
    options.sections.rules = rulesSection(options, tools);
  });
}
