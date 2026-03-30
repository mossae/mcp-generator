import { TokenCounter } from "@/core/token-counter";
import { createRocketChatProvider } from "@/providers/rocketchat";

const provider = createRocketChatProvider();
const counter = new TokenCounter();

const FULL_RC_ENDPOINTS = 547;
const FULL_RC_TOKENS = FULL_RC_ENDPOINTS * 86;
const OVERHEAD = 500;
const FLASH_PRICE_PER_M = 0.075;
const FREE_TIER = 1_000_000;

const pad = (s: string, n: number) => s.padEnd(n);
const rpad = (s: string, n: number) => s.padStart(n);
const cost = (tokens: number) => "$" + ((tokens / 1_000_000) * FLASH_PRICE_PER_M).toFixed(4);

console.log("\n╔══════════════════════════════════════════════════════════════════════════╗");
console.log("║              MCP Generator — Token Savings Benchmark                    ║");
console.log("╚══════════════════════════════════════════════════════════════════════════╝\n");

console.log(`  Baseline: Full Rocket.Chat API = ${FULL_RC_ENDPOINTS} endpoints, ~${FULL_RC_TOKENS.toLocaleString()} tokens`);
console.log(`  (measured from OpenAPI specs — run \`npm run baseline\` to verify)\n`);

// --- Section 1: Per-workflow vs full API ---

console.log(`  ${pad("Workflow", 28)} ${rpad("Tools", 6)} ${rpad("Tokens", 8)} ${rpad("Savings", 8)} ${rpad("1 iter", 8)} ${rpad("10 iter", 10)} ${pad("Flags", 20)}`);
console.log("  " + "-".repeat(86));

for (const w of provider.workflowTemplates) {
  const tokens = counter.countWorkflow(w);
  const pct = ((1 - tokens / FULL_RC_TOKENS) * 100).toFixed(1) + "%";
  const oneIter = tokens + OVERHEAD;
  const tenIter = oneIter * 10;
  const flags: string[] = [];
  if (w.decisionPoints.length > 0) flags.push("decision");
  if (w.needsEventBridge) flags.push("events");
  if (w.errorHandlers.some((h) => h.strategy === "retry")) flags.push("retry");
  if (w.errorHandlers.some((h) => h.strategy === "rollback")) flags.push("rollback");

  console.log(
    `  ${pad(w.id, 28)} ${rpad(String(w.steps.length), 6)} ${rpad(String(tokens), 8)} ${rpad(pct, 8)} ${rpad(oneIter.toLocaleString(), 8)} ${rpad(tenIter.toLocaleString(), 10)} ${flags.join(", ")}`,
  );
}

const fullIter = FULL_RC_TOKENS + OVERHEAD;
const fullTenIter = fullIter * 10;

console.log("  " + "-".repeat(86));
console.log(
  `  ${pad("FULL RC API (baseline)", 28)} ${rpad(String(FULL_RC_ENDPOINTS), 6)} ${rpad(FULL_RC_TOKENS.toLocaleString(), 8)} ${rpad("-", 8)} ${rpad(fullIter.toLocaleString(), 8)} ${rpad(fullTenIter.toLocaleString(), 10)}`,
);

// --- Section 2: Combo scenarios ---

console.log("\n  --- Combo Scenarios (vs full 547-endpoint API) ---\n");

const combos = [
  { name: "Messaging only", ids: ["minimal-chatbot"] },
  { name: "Support team", ids: ["customer-support-bot", "content-moderation"] },
  { name: "DevOps", ids: ["cicd-notifier", "webhook-integration", "notification-bot"] },
  { name: "Team lead", ids: ["onboard-team-member", "team-standup", "channel-management"] },
  { name: "Full admin (5 tools)", ids: ["onboard-team-member", "channel-management", "content-moderation", "analytics-reporter", "room-listing"] },
];

console.log(`  ${pad("Scenario", 25)} ${rpad("Tools", 6)} ${rpad("Tokens", 8)} ${rpad("Saved", 8)} ${rpad("%", 8)} ${rpad("10 iter", 10)} ${rpad("Cost/task", 10)}`);
console.log("  " + "-".repeat(78));

const fullSessions = Math.floor(FREE_TIER / fullTenIter);
console.log(
  `  ${pad("Full RC API", 25)} ${rpad(String(FULL_RC_ENDPOINTS), 6)} ${rpad(FULL_RC_TOKENS.toLocaleString(), 8)} ${rpad("-", 8)} ${rpad("-", 8)} ${rpad(fullTenIter.toLocaleString(), 10)} ${rpad(cost(fullTenIter), 10)}`,
);

for (const combo of combos) {
  const selected = combo.ids
    .map((id) => provider.workflowTemplates.find((w) => w.id === id))
    .filter((w) => w != null);
  const tokens = selected.reduce((sum, w) => sum + counter.countWorkflow(w), 0);
  const saved = FULL_RC_TOKENS - tokens;
  const pct = ((saved / FULL_RC_TOKENS) * 100).toFixed(1) + "%";
  const tenIter = (tokens + OVERHEAD) * 10;

  console.log(
    `  ${pad(combo.name, 25)} ${rpad(String(selected.length), 6)} ${rpad(String(tokens), 8)} ${rpad(saved.toLocaleString(), 8)} ${rpad(pct, 8)} ${rpad(tenIter.toLocaleString(), 10)} ${rpad(cost(tenIter), 10)}`,
  );
}

// --- Section 3: Free tier comparison ---

console.log("\n  --- Gemini Flash Free Tier (1M tokens/day) ---\n");

console.log(`  ${pad("Scenario", 25)} ${rpad("Tasks/day", 10)} ${rpad("Cost/task", 10)} ${rpad("vs Full API", 12)}`);
console.log("  " + "-".repeat(60));

console.log(
  `  ${pad("Full RC API (547 ep)", 25)} ${rpad(String(fullSessions), 10)} ${rpad(cost(fullTenIter), 10)} ${rpad("-", 12)}`,
);

for (const combo of combos) {
  const selected = combo.ids
    .map((id) => provider.workflowTemplates.find((w) => w.id === id))
    .filter((w) => w != null);
  const tokens = selected.reduce((sum, w) => sum + counter.countWorkflow(w), 0);
  const tenIter = (tokens + OVERHEAD) * 10;
  const sessions = Math.floor(FREE_TIER / tenIter);
  const multiplier = fullSessions > 0 ? Math.round(sessions / fullSessions) : sessions;

  console.log(
    `  ${pad(combo.name, 25)} ${rpad(String(sessions), 10)} ${rpad(cost(tenIter), 10)} ${rpad(multiplier + "x more", 12)}`,
  );
}

console.log();
