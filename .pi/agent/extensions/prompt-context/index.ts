import type {
  ExtensionAPI,
  NormalizedBuildSystemPromptOptions,
} from "@earendil-works/pi-coding-agent";

function toolLines(options: NormalizedBuildSystemPromptOptions): string[] {
  return options.selectedTools.flatMap((name) => {
    const snippet = options.toolSnippets[name];

    return snippet === undefined || snippet === "" ? [] : [`- ${name}: ${snippet}`];
  });
}

function guidelineLines(options: NormalizedBuildSystemPromptOptions): string[] {
  return [
    ...new Set(
      [
        ...options.selectedTools.flatMap((name) => options.toolGuidelines[name] ?? []),
        ...options.promptGuidelines,
      ]
        .values()
        .map((guideline) => guideline.trim())
        .filter(Boolean),
    ),
  ].map((guideline) => `- ${guideline}`);
}

function activeToolContext(options: NormalizedBuildSystemPromptOptions): string {
  const tools = toolLines(options);
  const guidelines = guidelineLines(options);
  const sections: string[] = [];

  if (tools.length > 0) {
    sections.push(`## Active tools\n\n${tools.join("\n")}`);
  }

  if (guidelines.length > 0) {
    sections.push(`## Tool guidelines\n\n${guidelines.join("\n")}`);
  }

  return sections.join("\n\n");
}

export default function promptContextExtension(pi: ExtensionAPI): void {
  pi.on("before_agent_start", ({ systemPromptOptions: options }) => {
    // Pi treats an empty custom prompt as absent.
    if (options.customPrompt === undefined || options.customPrompt === "") {
      return;
    }

    const context = activeToolContext(options);

    if (context === "") {
      delete options.sections.active_tool_context;
    } else {
      options.sections.active_tool_context = context;
    }
  });
}
