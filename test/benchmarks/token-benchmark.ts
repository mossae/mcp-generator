import { TokenCounter } from "@/core/token-counter";
import { createRocketChatProvider } from "@/providers/rocketchat";

const provider = createRocketChatProvider();
const counter = new TokenCounter();

const pad = (s: string, n: number) => s.padEnd(n);
const rpad = (s: string, n: number) => s.padStart(n);

const fullTokens = provider.workflowTemplates.reduce(
  (sum, w) => sum + counter.countWorkflow(w), 0,
);

console.log("\n╔══════════════════════════════════════════════════════════════════════════╗");
console.log("║              MCP Generator — Token Savings Benchmark                    ║");
console.log("╚══════════════════════════════════════════════════════════════════════════╝\n");

console.log(`Full server: ${provider.workflowTemplates.length} tools, ~${fullTokens} tokens\n`);

console.log(`${pad("Workflow", 30)} ${rpad("Steps", 6)} ${rpad("Tokens", 8)} ${rpad("Saved", 8)} ${rpad("%", 7)} ${pad("Flags", 20)}`);
console.log("-".repeat(82));

const rows: Array<{
  id: string;
  steps: number;
  tokens: number;
  saved: number;
  pct: string;
  flags: string[];
}> = [];

for (const w of provider.workflowTemplates) {
  const tokens = counter.countWorkflow(w);
  const saved = fullTokens - tokens;
  const pct = ((saved / fullTokens) * 100).toFixed(1);
  const flags: string[] = [];
  if (w.decisionPoints.length > 0) flags.push("decision");
  if (w.needsEventBridge) flags.push("events");
  if (w.errorHandlers.some((h) => h.strategy === "retry")) flags.push("retry");
  if (w.errorHandlers.some((h) => h.strategy === "rollback")) flags.push("rollback");

  rows.push({ id: w.id, steps: w.steps.length, tokens, saved, pct, flags });

  console.log(
    `${pad(w.id, 30)} ${rpad(String(w.steps.length), 6)} ${rpad(String(tokens), 8)} ${rpad(String(saved), 8)} ${rpad(pct + "%", 7)} ${flags.join(", ")}`,
  );
}

console.log("-".repeat(82));

const avgTokens = Math.round(rows.reduce((s, r) => s + r.tokens, 0) / rows.length);
const avgSaved = Math.round(rows.reduce((s, r) => s + r.saved, 0) / rows.length);
const avgPct = (rows.reduce((s, r) => s + parseFloat(r.pct), 0) / rows.length).toFixed(1);

console.log(
  `${pad("AVERAGE (single workflow)", 30)} ${rpad("-", 6)} ${rpad(String(avgTokens), 8)} ${rpad(String(avgSaved), 8)} ${rpad(avgPct + "%", 7)}`,
);

console.log("\n--- Combo Scenarios ---\n");

const combos = [
  { name: "Messaging only", ids: ["minimal-chatbot"] },
  { name: "Support team", ids: ["customer-support-bot", "content-moderation"] },
  { name: "DevOps", ids: ["cicd-notifier", "webhook-integration", "notification-bot"] },
  { name: "Team lead", ids: ["onboard-team-member", "team-standup", "channel-management"] },
  { name: "Full admin", ids: ["onboard-team-member", "channel-management", "content-moderation", "analytics-reporter"] },
];

console.log(`${pad("Scenario", 25)} ${rpad("Tools", 6)} ${rpad("Tokens", 8)} ${rpad("Full", 8)} ${rpad("Saved", 8)} ${rpad("%", 7)}`);
console.log("-".repeat(65));

for (const combo of combos) {
  const selected = combo.ids
    .map((id) => provider.workflowTemplates.find((w) => w.id === id))
    .filter((w) => w != null);
  const report = counter.compare(selected, provider.workflowTemplates);

  console.log(
    `${pad(combo.name, 25)} ${rpad(String(report.selectedTools), 6)} ${rpad(String(report.selectedTokens), 8)} ${rpad(String(report.fullTokens), 8)} ${rpad(String(report.savedTokens), 8)} ${rpad(report.savingsPercent + "%", 7)}`,
  );
}

console.log("\n--- Per-Agent-Loop Savings (10 iterations) ---\n");

const iterationCost = (tokens: number, iters: number) => tokens * iters;
const flashPricePerMToken = 0.075;
const costUsd = (tokens: number) => ((tokens / 1_000_000) * flashPricePerMToken).toFixed(6);

console.log(`${pad("Scenario", 25)} ${rpad("1 loop", 10)} ${rpad("10 loops", 10)} ${rpad("Full 10x", 10)} ${rpad("$ saved", 10)}`);
console.log("-".repeat(68));

for (const combo of combos) {
  const selected = combo.ids
    .map((id) => provider.workflowTemplates.find((w) => w.id === id))
    .filter((w) => w != null);
  const report = counter.compare(selected, provider.workflowTemplates);

  const min10 = iterationCost(report.selectedTokens, 10);
  const full10 = iterationCost(report.fullTokens, 10);
  const saved = full10 - min10;

  console.log(
    `${pad(combo.name, 25)} ${rpad(String(report.selectedTokens), 10)} ${rpad(String(min10), 10)} ${rpad(String(full10), 10)} ${rpad("$" + costUsd(saved), 10)}`,
  );
}

console.log();
