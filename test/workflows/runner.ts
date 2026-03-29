import { Generator } from "@/core/generator";
import { createRocketChatProvider } from "@/providers/rocketchat";
import type { GeneratorConfig } from "@/types";
import type { EmittedFile } from "@/core/code-emitter";
import type { TokenReport } from "@/core/generator";

export interface WorkflowTestResult {
  workflowId: string;
  files: EmittedFile[];
  tokenReport: TokenReport;
  hasDecisionLogic: boolean;
  hasErrorHandling: boolean;
  hasEventBridge: boolean;
  toolFileContent: string;
}

const provider = createRocketChatProvider();
const generator = new Generator();

export function runWorkflow(workflowId: string): WorkflowTestResult {
  const config: GeneratorConfig = {
    provider: "rocketchat",
    selectedWorkflows: [workflowId],
    outputDir: "./test-output",
    includeEventBridge: false,
    serverName: "test-mcp",
    serverVersion: "1.0.0",
  };

  const result = generator.generateInMemory(provider, config);
  const toolFile = result.files.find((f) => f.path.includes(`tools/${workflowId}.ts`));
  const content = toolFile?.content ?? "";

  return {
    workflowId,
    files: result.files,
    tokenReport: result.tokenReport,
    hasDecisionLogic: content.includes("if ("),
    hasErrorHandling: content.includes("try {"),
    hasEventBridge: result.files.some((f) => f.path.startsWith("rc-app/")),
    toolFileContent: content,
  };
}

export function getProvider() {
  return provider;
}
