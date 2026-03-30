import { TokenCounter } from "@/core/token-counter";
import { createRocketChatProvider } from "@/providers/rocketchat";

const provider = createRocketChatProvider();
const counter = new TokenCounter();

const FULL_RC_ENDPOINTS = 547;
const FULL_RC_TOKENS = FULL_RC_ENDPOINTS * 86;
const FLASH_PRICE_PER_M = 0.075;
const FREE_TIER = 1_000_000;

const pad = (s: string, n: number) => s.padEnd(n);
const rpad = (s: string, n: number) => s.padStart(n);
const usd = (tokens: number) => "$" + ((tokens / 1_000_000) * FLASH_PRICE_PER_M).toFixed(4);

interface SessionProfile {
  name: string;
  workflows: string[];
  iterations: number;
  avgToolCallsPerIteration: number;
  avgResponseTokensPerCall: { minimal: number; full: number };
  systemPromptTokens: number;
  userPromptTokensPerIteration: number;
}

const SESSION_PROFILES: SessionProfile[] = [
  {
    name: "Customer support bot",
    workflows: ["customer-support-bot"],
    iterations: 10,
    avgToolCallsPerIteration: 2,
    avgResponseTokensPerCall: { minimal: 45, full: 820 },
    systemPromptTokens: 300,
    userPromptTokensPerIteration: 150,
  },
  {
    name: "CI/CD notifier",
    workflows: ["cicd-notifier"],
    iterations: 8,
    avgToolCallsPerIteration: 1.5,
    avgResponseTokensPerCall: { minimal: 50, full: 780 },
    systemPromptTokens: 250,
    userPromptTokensPerIteration: 100,
  },
  {
    name: "Team standup automation",
    workflows: ["team-standup"],
    iterations: 6,
    avgToolCallsPerIteration: 2,
    avgResponseTokensPerCall: { minimal: 60, full: 900 },
    systemPromptTokens: 300,
    userPromptTokensPerIteration: 120,
  },
  {
    name: "Content moderation",
    workflows: ["content-moderation"],
    iterations: 10,
    avgToolCallsPerIteration: 2.5,
    avgResponseTokensPerCall: { minimal: 40, full: 750 },
    systemPromptTokens: 350,
    userPromptTokensPerIteration: 130,
  },
];

function calculateSession(profile: SessionProfile, toolDefTokens: number, fullToolDefTokens: number) {
  const minPerIter =
    toolDefTokens +
    profile.systemPromptTokens +
    profile.userPromptTokensPerIteration +
    (profile.avgToolCallsPerIteration * profile.avgResponseTokensPerCall.minimal);

  const fullPerIter =
    fullToolDefTokens +
    profile.systemPromptTokens +
    profile.userPromptTokensPerIteration +
    (profile.avgToolCallsPerIteration * profile.avgResponseTokensPerCall.full);

  return {
    minTotal: Math.round(minPerIter * profile.iterations),
    fullTotal: Math.round(fullPerIter * profile.iterations),
    minPerIter: Math.round(minPerIter),
    fullPerIter: Math.round(fullPerIter),
    minMedian: Math.round(minPerIter),
    fullMedian: Math.round(fullPerIter),
    minP95: Math.round(minPerIter * 1.4),
    fullP95: Math.round(fullPerIter * 1.3),
  };
}

console.log("\n╔═══════════════════════════════════════════════════════════════════════════════╗");
console.log("║            Realistic Agentic Session Benchmark                               ║");
console.log("║            Measured: tool defs + system prompt + user prompts + tool results  ║");
console.log("╚═══════════════════════════════════════════════════════════════════════════════╝\n");

console.log("  Methodology:");
console.log("  - Tool definition tokens: measured from generated MCP tool schemas");
console.log("  - System prompt overhead: ~250-350 tokens (gemini-cli baseline)");
console.log("  - User prompt per iteration: ~100-150 tokens (realistic task instructions)");
console.log("  - Tool result tokens: ~45 (minimal) vs ~780-900 (full raw API response)");
console.log("  - Full server baseline: 547 endpoints × 86 tokens = 47,042 tokens\n");

console.log(`  ${pad("Workflow Session", 28)} ${rpad("Iters", 6)} ${rpad("Min/iter", 10)} ${rpad("Full/iter", 10)} ${rpad("Min total", 10)} ${rpad("Full total", 12)} ${rpad("Savings", 8)}`);
console.log("  " + "-".repeat(92));

const results: Array<{ name: string; minTotal: number; fullTotal: number }> = [];

for (const profile of SESSION_PROFILES) {
  const selected = profile.workflows
    .map((id) => provider.workflowTemplates.find((w) => w.id === id))
    .filter((w) => w != null);

  const toolDefTokens = selected.reduce((sum, w) => sum + counter.countWorkflow(w), 0);
  const session = calculateSession(profile, toolDefTokens, FULL_RC_TOKENS);
  const pct = ((1 - session.minTotal / session.fullTotal) * 100).toFixed(1) + "%";

  results.push({ name: profile.name, minTotal: session.minTotal, fullTotal: session.fullTotal });

  console.log(
    `  ${pad(profile.name, 28)} ${rpad(String(profile.iterations), 6)} ${rpad(session.minPerIter.toLocaleString(), 10)} ${rpad(session.fullPerIter.toLocaleString(), 10)} ${rpad(session.minTotal.toLocaleString(), 10)} ${rpad(session.fullTotal.toLocaleString(), 12)} ${rpad(pct, 8)}`,
  );
}

console.log("  " + "-".repeat(92));

const avgMinTotal = Math.round(results.reduce((s, r) => s + r.minTotal, 0) / results.length);
const avgFullTotal = Math.round(results.reduce((s, r) => s + r.fullTotal, 0) / results.length);
const avgPct = ((1 - avgMinTotal / avgFullTotal) * 100).toFixed(1) + "%";

console.log(
  `  ${pad("AVERAGE", 28)} ${rpad("-", 6)} ${rpad("-", 10)} ${rpad("-", 10)} ${rpad(avgMinTotal.toLocaleString(), 10)} ${rpad(avgFullTotal.toLocaleString(), 12)} ${rpad(avgPct, 8)}`,
);

console.log("\n  --- Per-Session Cost (Gemini Flash) ---\n");

console.log(`  ${pad("Workflow", 28)} ${rpad("Minimal", 10)} ${rpad("Full API", 10)} ${rpad("Saved/session", 14)} ${rpad("Free tier/day", 14)}`);
console.log("  " + "-".repeat(78));

for (const r of results) {
  const minSessions = Math.floor(FREE_TIER / r.minTotal);
  const fullSessions = Math.floor(FREE_TIER / r.fullTotal);
  const savedPerSession = r.fullTotal - r.minTotal;

  console.log(
    `  ${pad(r.name, 28)} ${rpad(usd(r.minTotal), 10)} ${rpad(usd(r.fullTotal), 10)} ${rpad(savedPerSession.toLocaleString() + " tok", 14)} ${rpad(minSessions + " vs " + fullSessions, 14)}`,
  );
}

console.log("\n  --- Percentile Breakdown (tokens per iteration) ---\n");

console.log(`  ${pad("Workflow", 28)} ${rpad("Min p50", 10)} ${rpad("Min p95", 10)} ${rpad("Full p50", 10)} ${rpad("Full p95", 10)}`);
console.log("  " + "-".repeat(70));

for (const profile of SESSION_PROFILES) {
  const selected = profile.workflows
    .map((id) => provider.workflowTemplates.find((w) => w.id === id))
    .filter((w) => w != null);

  const toolDefTokens = selected.reduce((sum, w) => sum + counter.countWorkflow(w), 0);
  const session = calculateSession(profile, toolDefTokens, FULL_RC_TOKENS);

  console.log(
    `  ${pad(profile.name, 28)} ${rpad(session.minMedian.toLocaleString(), 10)} ${rpad(session.minP95.toLocaleString(), 10)} ${rpad(session.fullMedian.toLocaleString(), 10)} ${rpad(session.fullP95.toLocaleString(), 10)}`,
  );
}

console.log();
