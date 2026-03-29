import * as fs from "node:fs";
import * as path from "node:path";
import type { GeneratorConfig, ProviderSpec, WorkflowTemplate } from "../types/index.js";
import { CodeEmitter, type EmittedFile } from "./code-emitter.js";
import { TokenCounter } from "./token-counter.js";

export interface GeneratorResult {
  files: EmittedFile[];
  tokenReport: TokenReport;
  outputDir: string;
}

export interface TokenReport {
  selectedTools: number;
  totalTools: number;
  selectedTokens: number;
  fullTokens: number;
  savedTokens: number;
  savingsPercent: string;
  perToolBreakdown: Array<{ name: string; tokens: number }>;
}

export class Generator {
  private emitter: CodeEmitter;
  private tokenCounter: TokenCounter;

  constructor() {
    this.emitter = new CodeEmitter();
    this.tokenCounter = new TokenCounter();
  }

  /**
   * Generate a minimal MCP server project.
   */
  generate(provider: ProviderSpec, config: GeneratorConfig): GeneratorResult {
    // Resolve selected workflows
    const selected = this.resolveWorkflows(provider, config.selectedWorkflows);
    if (selected.length === 0) {
      throw new Error(
        `No workflows matched: ${config.selectedWorkflows.join(", ")}. ` +
        `Available: ${provider.workflowTemplates.map((w) => w.id).join(", ")}`,
      );
    }

    // Emit all files
    const files = this.emitter.emitProject(provider, selected, config);

    // Calculate token savings
    const tokenReport = this.tokenCounter.compare(
      selected,
      provider.workflowTemplates,
    );

    // Write files to disk
    this.writeFiles(config.outputDir, files);

    return {
      files,
      tokenReport,
      outputDir: config.outputDir,
    };
  }

  /**
   * Generate without writing to disk (for testing).
   */
  generateInMemory(
    provider: ProviderSpec,
    config: GeneratorConfig,
  ): GeneratorResult {
    const selected = this.resolveWorkflows(provider, config.selectedWorkflows);
    if (selected.length === 0) {
      throw new Error(`No workflows matched: ${config.selectedWorkflows.join(", ")}`);
    }

    const files = this.emitter.emitProject(provider, selected, config);
    const tokenReport = this.tokenCounter.compare(selected, provider.workflowTemplates);

    return { files, tokenReport, outputDir: config.outputDir };
  }

  private resolveWorkflows(
    provider: ProviderSpec,
    selectedIds: string[],
  ): WorkflowTemplate[] {
    return selectedIds
      .map((id) => provider.workflowTemplates.find((w) => w.id === id))
      .filter((w): w is WorkflowTemplate => w != null);
  }

  private writeFiles(outputDir: string, files: EmittedFile[]): void {
    for (const file of files) {
      const fullPath = path.join(outputDir, file.path);
      const dir = path.dirname(fullPath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, file.content, "utf-8");
    }
  }
}
