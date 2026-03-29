import { Command } from "commander";
import { createRocketChatProvider } from "@/providers/rocketchat";
import { TokenCounter } from "@/core/token-counter";

export const listCommand = new Command("list")
  .description("List available workflows and capabilities")
  .option("--json", "Output as JSON")
  .action((opts) => {
    const provider = createRocketChatProvider();
    const counter = new TokenCounter();

    if (opts.json) {
      const data = provider.workflowTemplates.map((w) => ({
        id: w.id,
        name: w.name,
        tool: w.toolName,
        description: w.toolDescription,
        tokens: counter.countWorkflow(w),
        steps: w.steps.length,
        hasDecisionLogic: w.decisionPoints.length > 0,
        needsEventBridge: w.needsEventBridge,
      }));
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log(`\n  Available Workflows (${provider.workflowTemplates.length})\n`);

    for (const w of provider.workflowTemplates) {
      const tokens = counter.countWorkflow(w);
      const flags = [
        w.decisionPoints.length > 0 ? "decision-logic" : null,
        w.needsEventBridge ? "event-bridge" : null,
      ].filter(Boolean);

      console.log(`  ${w.id}`);
      console.log(`    ${w.toolDescription}`);
      console.log(`    steps: ${w.steps.length}  tokens: ~${tokens}  ${flags.length ? `[${flags.join(", ")}]` : ""}`);
      console.log();
    }
  });
