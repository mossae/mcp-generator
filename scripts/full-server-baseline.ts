import { parse } from "yaml";

const RC_OPENAPI_URLS = [
  "https://raw.githubusercontent.com/RocketChat/Rocket.Chat-Open-API/main/authentication.yaml",
  "https://raw.githubusercontent.com/RocketChat/Rocket.Chat-Open-API/main/messaging.yaml",
  "https://raw.githubusercontent.com/RocketChat/Rocket.Chat-Open-API/main/user-management.yaml",
  "https://raw.githubusercontent.com/RocketChat/Rocket.Chat-Open-API/main/settings.yaml",
  "https://raw.githubusercontent.com/RocketChat/Rocket.Chat-Open-API/main/content-management.yaml",
];

const FALLBACK_ENDPOINT_COUNT = 547;
const GEMINI_FLASH_INPUT_PRICE_PER_M = 0.075;
const FREE_TIER_TOKENS_PER_DAY = 1_000_000;

interface EndpointInfo {
  operationId: string;
  method: string;
  path: string;
  summary: string;
  parameters: number;
  hasBody: boolean;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function estimateToolTokens(ep: EndpointInfo): number {
  const toolDef = {
    name: ep.operationId,
    description: ep.summary || `${ep.method} ${ep.path}`,
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  };

  if (ep.hasBody) {
    (toolDef.inputSchema.properties as any).body = {
      type: "object",
      description: "Request body",
    };
  }

  for (let i = 0; i < ep.parameters; i++) {
    (toolDef.inputSchema.properties as any)[`param${i}`] = {
      type: "string",
      description: `Parameter ${i}`,
    };
  }

  return estimateTokens(JSON.stringify(toolDef));
}

async function fetchAndParse(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    return parse(text);
  } catch {
    return null;
  }
}

function extractEndpoints(spec: any): EndpointInfo[] {
  const endpoints: EndpointInfo[] = [];
  const paths = spec?.paths ?? {};

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, details] of Object.entries(methods as any)) {
      if (["get", "post", "put", "delete", "patch"].includes(method)) {
        const d = details as any;
        endpoints.push({
          operationId: d.operationId ?? `${method}_${path}`,
          method: method.toUpperCase(),
          path,
          summary: d.summary ?? d.description ?? "",
          parameters: (d.parameters ?? []).length,
          hasBody: !!d.requestBody,
        });
      }
    }
  }

  return endpoints;
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║       Rocket.Chat Full API — Token Baseline Calculator      ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  console.log("  Fetching Rocket.Chat OpenAPI specs...\n");

  const allEndpoints: EndpointInfo[] = [];
  let fetchedSpecs = 0;

  for (const url of RC_OPENAPI_URLS) {
    const filename = url.split("/").pop();
    const spec = await fetchAndParse(url);
    if (spec) {
      const eps = extractEndpoints(spec);
      allEndpoints.push(...eps);
      console.log(`    ${filename}: ${eps.length} endpoints`);
      fetchedSpecs++;
    } else {
      console.log(`    ${filename}: failed to fetch`);
    }
  }

  const fetchedCount = allEndpoints.length;
  const totalEstimated = FALLBACK_ENDPOINT_COUNT;

  console.log(`\n  Fetched: ${fetchedCount} endpoints from ${fetchedSpecs} specs`);
  console.log(`  Rocket.Chat total documented: ${totalEstimated} endpoints`);

  let totalTokens: number;
  let avgTokensPerEndpoint: number;

  if (fetchedCount > 0) {
    const fetchedTokens = allEndpoints.reduce(
      (sum, ep) => sum + estimateToolTokens(ep),
      0,
    );
    avgTokensPerEndpoint = Math.round(fetchedTokens / fetchedCount);
    totalTokens = avgTokensPerEndpoint * totalEstimated;

    console.log(`\n  Measured avg tokens per endpoint: ~${avgTokensPerEndpoint}`);
  } else {
    avgTokensPerEndpoint = 210;
    totalTokens = avgTokensPerEndpoint * totalEstimated;
    console.log(`\n  Using estimated avg: ~${avgTokensPerEndpoint} tokens/endpoint`);
  }

  console.log(`\n  ═══════════════════════════════════════════════`);
  console.log(`  FULL RC API BASELINE: ~${totalTokens.toLocaleString()} tokens`);
  console.log(`  (${totalEstimated} endpoints × ~${avgTokensPerEndpoint} tokens avg)`);
  console.log(`  ═══════════════════════════════════════════════\n`);

  const overhead = 500;
  const perIteration = totalTokens + overhead;
  const per10Task = perIteration * 10;

  console.log("  Per agent iteration:    ~" + perIteration.toLocaleString() + " tokens");
  console.log("  Per 10-step task:       ~" + per10Task.toLocaleString() + " tokens");
  console.log("  Cost per task (Flash):  $" + ((per10Task / 1_000_000) * GEMINI_FLASH_INPUT_PRICE_PER_M).toFixed(4));

  const tasksPerDay = Math.floor(FREE_TIER_TOKENS_PER_DAY / per10Task);
  console.log(`\n  Gemini Flash free tier: ${tasksPerDay} complete 10-step tasks/day`);

  if (tasksPerDay === 0) {
    console.log("  ⚠ A single task EXCEEDS the free tier daily limit");
    console.log(`  ⚠ Would need ${Math.ceil(per10Task / FREE_TIER_TOKENS_PER_DAY)} days of free tier for ONE task`);
  }

  console.log("\n  This is the number your minimal MCP server saves against.\n");
}

main();
