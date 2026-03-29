import { Command } from "commander";
import { createRocketChatProvider } from "@/providers/rocketchat";
import { TokenCounter } from "@/core/token-counter";
import { NLParser } from "@/cli/nl-parser";

export const measureCommand = new Command("measure")
  .description("Measure token savings for a set of workflows")
  .option("-c, --capabilities <text>", "Natural language description")
  .option("-w, --workflows <ids>", "Comma-separated workflow IDs")
  .option("--all", "Measure all workflows individually")
  .action((opts) => {
    const provider = createRocketChatProvider();
    const counter = new TokenCounter();

    if (opts.all) {
      printComparisonTable(counter, provider);
      return;
    }

    let selectedIds: string[];

    if (opts.workflows) {
      selectedIds = opts.workflows.split(",").map((s: string) => s.trim());
    } else if (opts.capabilities) {
      const parser = new NLParser(provider.workflowTemplates);
      const matches = parser.parse(opts.capabilities);
      if (matches.length === 0) {
        console.error("No workflows matched your description.");
        process.exit(1);
      }
      selectedIds = matches.map((m) => m.workflow.id);
    } else {
      console.error("Provide --capabilities, --workflows, or --all");
      process.exit(1);
    }

    const selected = selectedIds
      .map((id) => provider.workflowTemplates.find((w) => w.id === id))
      .filter((w) => w != null);

    if (selected.length === 0) {
      console.error("No valid workflows found.");
      process.exit(1);
    }

    const report = counter.compare(selected, provider.workflowTemplates);
    console.log(counter.formatReport(report));
  });

function printComparisonTable(counter: TokenCounter, provider: ReturnType<typeof createRocketChatProvider>) {
  const fullTokens = provider.workflowTemplates.reduce(
    (sum, w) => sum + counter.countWorkflow(w), 0,
  );

  const pad = (s: string, n: number) => s.padEnd(n);
  const rpad = (s: string, n: number) => s.padStart(n);

  console.log("\n  Workflow Token Comparison\n");
  console.log(`  ${pad("Workflow", 30)} ${rpad("Steps", 6)} ${rpad("Tokens", 8)} ${rpad("Full", 8)} ${rpad("Savings", 8)}`);
  console.log("  " + "-".repeat(68));

  for (const w of provider.workflowTemplates) {
    const tokens = counter.countWorkflow(w);
    const saved = fullTokens - tokens;
    const pct = ((saved / fullTokens) * 100).toFixed(1) + "%";
    console.log(
      `  ${pad(w.id, 30)} ${rpad(String(w.steps.length), 6)} ${rpad(String(tokens), 8)} ${rpad(String(fullTokens), 8)} ${rpad(pct, 8)}`,
    );
  }

  console.log();
  console.log(`  Full server: ${provider.workflowTemplates.length} tools, ~${fullTokens} tokens`);
  console.log();
}
