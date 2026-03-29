import type { WorkflowTemplate } from "@/types";
import type { TokenReport } from "@/core/generator";

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

  compare(selected: WorkflowTemplate[], all: WorkflowTemplate[]): TokenReport {
    const selectedBreakdown = selected.map((w) => ({
      name: w.toolName,
      tokens: this.countWorkflow(w),
    }));

    const allBreakdown = all.map((w) => ({
      name: w.toolName,
      tokens: this.countWorkflow(w),
    }));

    const selectedTokens = selectedBreakdown.reduce((sum, t) => sum + t.tokens, 0);
    const fullTokens = allBreakdown.reduce((sum, t) => sum + t.tokens, 0);
    const savedTokens = fullTokens - selectedTokens;

    return {
      selectedTools: selected.length,
      totalTools: all.length,
      selectedTokens,
      fullTokens,
      savedTokens,
      savingsPercent: fullTokens > 0
        ? ((savedTokens / fullTokens) * 100).toFixed(1)
        : "0.0",
      perToolBreakdown: selectedBreakdown,
    };
  }

  formatReport(report: TokenReport): string {
    const lines = [
      "",
      "=== Token Savings Report ===",
      `Selected: ${report.selectedTools} tools / ${report.totalTools} total available`,
      `Tokens:   ~${report.selectedTokens} (selected) vs ~${report.fullTokens} (full server)`,
      `Saved:    ~${report.savedTokens} tokens (${report.savingsPercent}%)`,
      "",
      "Per-tool breakdown:",
      ...report.perToolBreakdown.map((t) => `  ${t.name}: ~${t.tokens} tokens`),
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
