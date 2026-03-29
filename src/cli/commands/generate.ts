import { Command } from "commander";
import { checkbox, input } from "@inquirer/prompts";
import { Generator } from "@/core/generator";
import { TokenCounter } from "@/core/token-counter";
import { NLParser } from "@/cli/nl-parser";
import { createRocketChatProvider } from "@/providers/rocketchat";
import type { GeneratorConfig } from "@/types";

export const generateCommand = new Command("generate")
  .description("Generate a minimal MCP server for Rocket.Chat")
  .option("-c, --capabilities <text>", "Natural language description of what you need")
  .option("-w, --workflows <ids>", "Comma-separated workflow IDs")
  .option("-o, --output <dir>", "Output directory", "./generated-mcp-server")
  .option("-n, --name <name>", "Server name", "rocketchat-mcp")
  .option("--non-interactive", "Skip interactive prompts")
  .action(async (opts) => {
    const provider = createRocketChatProvider();
    const parser = new NLParser(provider.workflowTemplates);
    const counter = new TokenCounter();

    let selectedIds: string[];

    if (opts.workflows) {
      selectedIds = opts.workflows.split(",").map((s: string) => s.trim());
    } else if (opts.capabilities) {
      const matches = parser.parse(opts.capabilities);
      if (matches.length === 0) {
        console.error("No workflows matched your description. Use --workflows or run interactively.");
        process.exit(1);
      }

      if (opts.nonInteractive) {
        selectedIds = matches.map((m) => m.workflow.id);
      } else {
        console.log("\nMatched workflows:");
        matches.forEach((m) => {
          console.log(`  ${m.workflow.name} (${m.workflow.id}) — score: ${(m.score * 100).toFixed(0)}%`);
        });

        selectedIds = await checkbox({
          message: "Select workflows to include:",
          choices: matches.map((m) => ({
            name: `${m.workflow.name} — ${m.workflow.toolDescription}`,
            value: m.workflow.id,
            checked: m.score > 0.5,
          })),
        });
      }
    } else if (opts.nonInteractive) {
      console.error("Provide --capabilities or --workflows in non-interactive mode.");
      process.exit(1);
    } else {
      selectedIds = await runInteractive(provider.workflowTemplates);
    }

    if (selectedIds.length === 0) {
      console.error("No workflows selected.");
      process.exit(1);
    }

    const config: GeneratorConfig = {
      provider: "rocketchat",
      selectedWorkflows: selectedIds,
      outputDir: opts.output,
      includeEventBridge: false,
      serverName: opts.name,
      serverVersion: "1.0.0",
    };

    const generator = new Generator();
    const result = generator.generate(provider, config);

    console.log(`\nGenerated ${result.files.length} files in ${opts.output}/`);
    console.log(counter.formatReport(result.tokenReport));
  });

async function runInteractive(
  workflows: Array<{ id: string; name: string; toolDescription: string }>,
): Promise<string[]> {
  const nlInput = await input({
    message: "Describe what you need (or press Enter to pick manually):",
  });

  if (nlInput.trim()) {
    const provider = createRocketChatProvider();
    const parser = new NLParser(provider.workflowTemplates);
    const matches = parser.parse(nlInput);

    if (matches.length > 0) {
      return checkbox({
        message: "Select workflows to include:",
        choices: matches.map((m) => ({
          name: `${m.workflow.name} — ${m.workflow.toolDescription}`,
          value: m.workflow.id,
          checked: m.score > 0.5,
        })),
      });
    }
  }

  return checkbox({
    message: "Select workflows:",
    choices: workflows.map((w) => ({
      name: `${w.name} — ${w.toolDescription}`,
      value: w.id,
    })),
  });
}
