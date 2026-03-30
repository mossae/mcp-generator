import type { WorkflowTemplate } from "@/types";
import type { ApiEndpoint } from "@/types";
import type { TokenReport } from "@/core/generator";

const FULL_RC_API_ENDPOINT_COUNT = 547;
const AVG_TOKENS_PER_RAW_ENDPOINT = 210;
const FULL_RC_API_TOKENS = FULL_RC_API_ENDPOINT_COUNT * AVG_TOKENS_PER_RAW_ENDPOINT;

const GEMINI_FLASH_FREE_TIER_TOKENS_PER_DAY = 1_000_000;
const OVERHEAD_PER_ITERATION = 500;

export class TokenCounter {
  countWorkflow(workflow: WorkflowTemplate): number {
    const toolDef = {
      name: workflow.toolName,
      description: workflow.toolDescription,
      inputSchema: this.buildInputSchema(workflow),
    };
    const serialized = JSON.stringify(toolDef);
    return this.estimateTokens(serialized);
  }

  countEndpoint(endpoint: ApiEndpoint): number {
    const toolDef = {
      name: endpoint.operationId,
      description: endpoint.summary,
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
    };
    return this.estimateTokens(JSON.stringify(toolDef));
  }

  countFullApi(endpoints: ApiEndpoint[]): number {
    return endpoints.reduce((sum, ep) => sum + this.countEndpoint(ep), 0);
  }

  compare(selected: WorkflowTemplate[], all: WorkflowTemplate[], endpoints?: ApiEndpoint[]): TokenReport {
    const selectedBreakdown = selected.map((w) => ({
      name: w.toolName,
      tokens: this.countWorkflow(w),
    }));

    const selectedTokens = selectedBreakdown.reduce((sum, t) => sum + t.tokens, 0);

    const fullApiTokens = endpoints
      ? this.countFullApi(endpoints)
      : FULL_RC_API_TOKENS;
    const fullApiToolCount = endpoints
      ? endpoints.length
      : FULL_RC_API_ENDPOINT_COUNT;

    const allWorkflowTokens = all.reduce((sum, w) => sum + this.countWorkflow(w), 0);

    const savedTokens = fullApiTokens - selectedTokens;

    const minimalPerIteration = selectedTokens + OVERHEAD_PER_ITERATION;
    const fullPerIteration = fullApiTokens + OVERHEAD_PER_ITERATION;

    const minimalPer10 = minimalPerIteration * 10;
    const fullPer10 = fullPerIteration * 10;

    const minimalSessions = Math.floor(GEMINI_FLASH_FREE_TIER_TOKENS_PER_DAY / minimalPer10);
    const fullSessions = Math.floor(GEMINI_FLASH_FREE_TIER_TOKENS_PER_DAY / fullPer10);

    return {
      selectedTools: selected.length,
      totalTools: fullApiToolCount,
      selectedTokens,
      fullTokens: allWorkflowTokens,
      savedTokens,
      savingsPercent: fullApiTokens > 0
        ? ((savedTokens / fullApiTokens) * 100).toFixed(1)
        : "0.0",
      perToolBreakdown: selectedBreakdown,
      fullApiTokens,
      fullApiToolCount,
      perIteration: { minimal: minimalPerIteration, full: fullPerIteration },
      per10Iterations: { minimal: minimalPer10, full: fullPer10 },
      freeTeeSessions: { minimal: minimalSessions, full: fullSessions },
    };
  }

  formatReport(report: TokenReport): string {
    const lines = [
      "",
      "=== Token Savings Report ===",
      "",
      `  Your server:  ${report.selectedTools} tools, ~${report.selectedTokens} tokens`,
      `  Full RC API:  ${report.fullApiToolCount} endpoints, ~${report.fullApiTokens} tokens`,
      `  Savings:      ~${report.savedTokens} tokens (${report.savingsPercent}%)`,
      "",
      "  Per-tool breakdown:",
      ...report.perToolBreakdown.map((t) => `    ${t.name}: ~${t.tokens} tokens`),
      "",
      "  --- Agent Loop Cost ---",
      "",
      `  Per iteration:     ~${report.perIteration.minimal} (minimal) vs ~${report.perIteration.full} (full)`,
      `  Per 10-step task:  ~${report.per10Iterations.minimal} (minimal) vs ~${report.per10Iterations.full} (full)`,
      "",
      "  --- Gemini Flash Free Tier (1M tokens/day) ---",
      "",
      `  Full RC API server:  ${report.freeTeeSessions.full} complete tasks/day`,
      `  Your minimal server: ${report.freeTeeSessions.minimal} complete tasks/day`,
      "",
    ];
    return lines.join("\n");
  }

  private buildInputSchema(workflow: WorkflowTemplate): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const input of workflow.inputs) {
      properties[input.name] = {
        type: input.type === "string[]" ? "array" : input.type,
        description: input.description,
        ...(input.enum ? { enum: input.enum } : {}),
        ...(input.type === "string[]" ? { items: { type: "string" } } : {}),
      };
      if (input.required) {
        required.push(input.name);
      }
    }

    return { type: "object", properties, required };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
