import { Command } from "commander";
import { checkbox, input } from "@inquirer/prompts";
import { Generator } from "@/core/generator";
import { TokenCounter } from "@/core/token-counter";
import { NLParser } from "@/cli/nl-parser";
import { loadAndResolve } from "@/cli/config-loader";
import { createRocketChatProvider } from "@/providers/rocketchat";
import type { GeneratorConfig } from "@/types";

export const generateCommand = new Command("generate")
  .description("Generate a minimal MCP server for Rocket.Chat")
  .option("-c, --capabilities <text>", "Natural language description of what you need")
  .option("-w, --workflows <ids>", "Comma-separated workflow IDs")
  .option("-o, --output <dir>", "Output directory")
  .option("-n, --name <name>", "Server name")
  .option("--config <path>", "Path to config file directory")
  .option("--non-interactive", "Skip interactive prompts")
  .action(async (opts) => {
    const provider = createRocketChatProvider();
    const parser = new NLParser(provider.workflowTemplates);
    const counter = new TokenCounter();

    const configFile = loadAndResolve(opts.config);
    const outputDir = opts.output ?? configFile?.config.outputDir ?? "./generated-mcp-server";
    const serverName = opts.name ?? configFile?.config.serverName ?? "rocketchat-mcp";

    let selectedIds: string[];

    if (opts.workflows) {
      selectedIds = opts.workflows.split(",").map((s: string) => s.trim());
    } else if (opts.capabilities) {
      selectedIds = resolveFromNL(parser, opts.capabilities, opts.nonInteractive);
    } else if (configFile) {
      console.log(`Using config: ${configFile.filePath}`);
      if (configFile.config.selectedWorkflows && configFile.config.selectedWorkflows.length > 0) {
        selectedIds = configFile.config.selectedWorkflows;
      } else if (configFile.capabilities && configFile.capabilities.length > 0) {
        const matches = parser.parseMultiple(configFile.capabilities);
        selectedIds = matches.map((m) => m.workflow.id);
      } else {
        console.error("Config file has no workflows or capabilities defined.");
        process.exit(1);
      }
    } else if (opts.nonInteractive) {
      console.error("Provide --capabilities, --workflows, or a config file.");
      process.exit(1);
    } else {
      selectedIds = await runInteractive(provider.workflowTemplates, parser);
    }

    if (selectedIds.length === 0) {
      console.error("No workflows selected.");
      process.exit(1);
    }

    const config: GeneratorConfig = {
      provider: "rocketchat",
      selectedWorkflows: selectedIds,
      outputDir,
      includeEventBridge: configFile?.config.includeEventBridge ?? false,
      serverName,
      serverVersion: configFile?.config.serverVersion ?? "1.0.0",
    };

    const generator = new Generator();
    const result = generator.generate(provider, config);

    console.log(`\nGenerated ${result.files.length} files in ${outputDir}/`);
    console.log(counter.formatReport(result.tokenReport));
  });

function resolveFromNL(parser: NLParser, text: string, nonInteractive: boolean): string[] {
  const matches = parser.parse(text);
  if (matches.length === 0) {
    console.error("No workflows matched your description.");
    process.exit(1);
  }

  if (nonInteractive) {
    return matches.map((m) => m.workflow.id);
  }

  console.log("\nMatched workflows:");
  matches.forEach((m) => {
    console.log(`  ${m.workflow.name} (${m.workflow.id}) — score: ${(m.score * 100).toFixed(0)}%`);
  });

  return matches.filter((m) => m.score > 0.5).map((m) => m.workflow.id);
}

async function runInteractive(
  workflows: Array<{ id: string; name: string; toolDescription: string }>,
  parser: NLParser,
): Promise<string[]> {
  const nlInput = await input({
    message: "Describe what you need (or press Enter to pick manually):",
  });

  if (nlInput.trim()) {
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
