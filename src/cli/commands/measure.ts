import { Command } from "commander";
import { createRocketChatProvider } from "@/providers/rocketchat";
import { TokenCounter } from "@/core/token-counter";
import { NLParser } from "@/cli/nl-parser";

const FULL_RC_ENDPOINTS = 547;
const FULL_RC_TOKENS = FULL_RC_ENDPOINTS * 86;
const FREE_TIER = 1_000_000;
const OVERHEAD = 500;
const FLASH_PRICE_PER_M = 0.075;

const pad = (s: string, n: number) => s.padEnd(n);
const rpad = (s: string, n: number) => s.padStart(n);
const cost = (tokens: number) => "$" + ((tokens / 1_000_000) * FLASH_PRICE_PER_M).toFixed(4);

export const measureCommand = new Command("measure")
  .description("Measure token savings for a set of workflows")
  .option("-c, --capabilities <text>", "Natural language description")
  .option("-w, --workflows <ids>", "Comma-separated workflow IDs")
  .option("--all", "Measure all workflows individually")
  .option("--verbose", "Explain what each number means")
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

    const tokens = selected.reduce((sum, w) => sum + counter.countWorkflow(w), 0);
    const minIter = tokens + OVERHEAD;
    const fullIter = FULL_RC_TOKENS + OVERHEAD;
    const min10 = minIter * 10;
    const full10 = fullIter * 10;
    const savedPct = ((1 - tokens / FULL_RC_TOKENS) * 100).toFixed(1);
    const minSessions = Math.floor(FREE_TIER / min10);
    const fullSessions = Math.floor(FREE_TIER / full10);

    const avgResultTokensMinimal = 45;
    const avgResultTokensFull = 820;
    const resultSavings10 = (avgResultTokensFull - avgResultTokensMinimal) * 10;
    const combinedSavings = (full10 - min10) + resultSavings10;

    if (opts.verbose) {
      console.log(`
  Tool definition tokens: ${tokens}
    → This is loaded into the AI's context on every single iteration
    → Full RC server would load ${FULL_RC_TOKENS.toLocaleString()} tokens instead

  Per iteration:     ${minIter.toLocaleString()} tokens  (vs ${fullIter.toLocaleString()} full server)
  Per 10-step task:  ${min10.toLocaleString()} tokens  (vs ${full10.toLocaleString()} full server)
  Savings per task:  ${(full10 - min10).toLocaleString()} tokens (${savedPct}%)

  Tool result size: ~${avgResultTokensMinimal} tokens per call (minimal focused return)
    → Raw RC API response would return ~${avgResultTokensFull} tokens instead
    → Across 10 iterations: saves additional ~${resultSavings10.toLocaleString()} tokens

  Combined savings per task: ~${combinedSavings.toLocaleString()} tokens
  Daily free tier capacity:  ${minSessions} tasks  (vs ${fullSessions} tasks full server)
  Cost per task (Flash):     ${cost(min10)}  (vs ${cost(full10)} full server)
`);
      console.log("  Per-tool breakdown:");
      for (const w of selected) {
        console.log(`    ${w.toolName}: ~${counter.countWorkflow(w)} tokens`);
      }
      console.log();
    } else {
      const report = counter.compare(selected, provider.workflowTemplates);
      console.log(counter.formatReport(report));
    }
  });

function printComparisonTable(counter: TokenCounter, provider: ReturnType<typeof createRocketChatProvider>) {
  console.log("\n  Baseline: Rocket.Chat full API = " + FULL_RC_ENDPOINTS + " endpoints, ~" + FULL_RC_TOKENS.toLocaleString() + " tokens");
  console.log("  (measured from OpenAPI specs, run `npm run baseline` to verify)\n");

  console.log(`  ${pad("Workflow", 28)} ${rpad("Tools", 6)} ${rpad("Tokens", 8)} ${rpad("Savings", 8)} ${rpad("1 iter", 8)} ${rpad("10 iter", 10)} ${rpad("Cost/task", 10)}`);
  console.log("  " + "-".repeat(86));

  for (const w of provider.workflowTemplates) {
    const tokens = counter.countWorkflow(w);
    const pct = ((1 - tokens / FULL_RC_TOKENS) * 100).toFixed(1) + "%";
    const oneIter = tokens + OVERHEAD;
    const tenIter = oneIter * 10;
    console.log(
      `  ${pad(w.id, 28)} ${rpad(String(w.steps.length), 6)} ${rpad(String(tokens), 8)} ${rpad(pct, 8)} ${rpad(oneIter.toLocaleString(), 8)} ${rpad(tenIter.toLocaleString(), 10)} ${rpad(cost(tenIter), 10)}`,
    );
  }

  const fullOneIter = FULL_RC_TOKENS + OVERHEAD;
  const fullTenIter = fullOneIter * 10;

  console.log("  " + "-".repeat(86));
  console.log(`  ${pad("FULL RC API (baseline)", 28)} ${rpad(String(FULL_RC_ENDPOINTS), 6)} ${rpad(FULL_RC_TOKENS.toLocaleString(), 8)} ${rpad("-", 8)} ${rpad(fullOneIter.toLocaleString(), 8)} ${rpad(fullTenIter.toLocaleString(), 10)} ${rpad(cost(fullTenIter), 10)}`);

  console.log("\n  --- Gemini Flash Free Tier (1M tokens/day) ---\n");

  const fullSessions = Math.floor(FREE_TIER / fullTenIter);

  console.log(`  ${pad("Scenario", 28)} ${rpad("Tasks/day", 10)} ${rpad("Cost/task", 10)}`);
  console.log("  " + "-".repeat(50));

  console.log(`  ${pad("Full RC API (547 endpoints)", 28)} ${rpad(String(fullSessions), 10)} ${rpad(cost(fullTenIter), 10)}`);

  const combos = [
    { name: "Messaging only", ids: ["minimal-chatbot"] },
    { name: "Support team", ids: ["customer-support-bot", "content-moderation"] },
    { name: "DevOps", ids: ["cicd-notifier", "notification-bot"] },
    { name: "Team lead", ids: ["onboard-team-member", "team-standup", "channel-management"] },
    { name: "Full admin (5 tools)", ids: ["onboard-team-member", "channel-management", "content-moderation", "analytics-reporter", "room-listing"] },
  ];

  for (const combo of combos) {
    const selected = combo.ids
      .map((id) => provider.workflowTemplates.find((w) => w.id === id))
      .filter((w) => w != null);
    const tokens = selected.reduce((sum, w) => sum + counter.countWorkflow(w), 0);
    const tenIter = (tokens + OVERHEAD) * 10;
    const sessions = Math.floor(FREE_TIER / tenIter);
    console.log(`  ${pad(combo.name, 28)} ${rpad(String(sessions), 10)} ${rpad(cost(tenIter), 10)}`);
  }

  console.log();
}
