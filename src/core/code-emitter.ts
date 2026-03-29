import Handlebars from "handlebars";
import type {
  WorkflowTemplate,
  WorkflowStep,
  DecisionPoint,
  ErrorHandler,
  ProviderSpec,
  GeneratorConfig,
} from "@/types";
import { toolTemplate } from "@/templates/tool";
import { serverTemplate } from "@/templates/server";
import { clientTemplate } from "@/templates/client";
import { packageJsonTemplate } from "@/templates/package-json";
import { tsconfigTemplate } from "@/templates/tsconfig-gen";
import { envTemplate } from "@/templates/env";
import { rcAppJsonTemplate } from "@/templates/rc-app-json";
import { rcAppIndexTemplate } from "@/templates/rc-app-index";
import { rcAppTsconfigTemplate } from "@/templates/rc-app-tsconfig";
import { rcAppPackageTemplate } from "@/templates/rc-app-package";
import { buildAppManifest } from "@/providers/rocketchat/event-bridge/app-manifest";
import { extractEventHandlers } from "@/providers/rocketchat/event-bridge/event-handlers";

export interface EmittedFile {
  path: string;
  content: string;
}

export class CodeEmitter {
  private toolCompiler: HandlebarsTemplateDelegate;
  private serverCompiler: HandlebarsTemplateDelegate;
  private clientCompiler: HandlebarsTemplateDelegate;
  private packageJsonCompiler: HandlebarsTemplateDelegate;
  private tsconfigCompiler: HandlebarsTemplateDelegate;
  private envCompiler: HandlebarsTemplateDelegate;
  private rcAppJsonCompiler: HandlebarsTemplateDelegate;
  private rcAppIndexCompiler: HandlebarsTemplateDelegate;
  private rcAppTsconfigCompiler: HandlebarsTemplateDelegate;
  private rcAppPackageCompiler: HandlebarsTemplateDelegate;

  constructor() {
    this.registerHelpers();
    this.toolCompiler = Handlebars.compile(toolTemplate, { noEscape: true });
    this.serverCompiler = Handlebars.compile(serverTemplate, { noEscape: true });
    this.clientCompiler = Handlebars.compile(clientTemplate, { noEscape: true });
    this.packageJsonCompiler = Handlebars.compile(packageJsonTemplate, { noEscape: true });
    this.tsconfigCompiler = Handlebars.compile(tsconfigTemplate, { noEscape: true });
    this.envCompiler = Handlebars.compile(envTemplate, { noEscape: true });
    this.rcAppJsonCompiler = Handlebars.compile(rcAppJsonTemplate, { noEscape: true });
    this.rcAppIndexCompiler = Handlebars.compile(rcAppIndexTemplate, { noEscape: true });
    this.rcAppTsconfigCompiler = Handlebars.compile(rcAppTsconfigTemplate, { noEscape: true });
    this.rcAppPackageCompiler = Handlebars.compile(rcAppPackageTemplate, { noEscape: true });
  }

  private registerHelpers(): void {
    Handlebars.registerHelper("camelCase", (str: string) => {
      return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    });

    Handlebars.registerHelper("pascalCase", (str: string) => {
      const camel = str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return camel.charAt(0).toUpperCase() + camel.slice(1);
    });

    Handlebars.registerHelper("zodType", (type: string) => {
      switch (type) {
        case "string": return "z.string()";
        case "number": return "z.number()";
        case "boolean": return "z.boolean()";
        case "string[]": return "z.array(z.string())";
        default: return "z.string()";
      }
    });

    Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
    Handlebars.registerHelper("json", (obj: unknown) => JSON.stringify(obj, null, 2));
  }

  emitProject(
    provider: ProviderSpec,
    workflows: WorkflowTemplate[],
    config: GeneratorConfig,
  ): EmittedFile[] {
    const files: EmittedFile[] = [];

    for (const workflow of workflows) {
      const toolCode = this.emitTool(workflow, provider);
      files.push({
        path: `server/src/tools/${workflow.id}.ts`,
        content: toolCode,
      });
    }

    files.push({
      path: "server/src/index.ts",
      content: this.serverCompiler({
        serverName: config.serverName,
        serverVersion: config.serverVersion,
        workflows,
      }),
    });

    files.push({
      path: "server/src/client.ts",
      content: this.clientCompiler({ provider }),
    });

    files.push({
      path: "package.json",
      content: this.packageJsonCompiler({
        serverName: config.serverName,
        serverVersion: config.serverVersion,
      }),
    });

    files.push({ path: "server/tsconfig.json", content: this.tsconfigCompiler({}) });

    files.push({
      path: ".env.example",
      content: this.envCompiler({ provider }),
    });

    const needsEventBridge = config.includeEventBridge ||
      workflows.some((w) => w.needsEventBridge);

    if (needsEventBridge) {
      files.push(...this.emitEventBridge(config.serverName, workflows));
    }

    return files;
  }

  private emitEventBridge(serverName: string, workflows: WorkflowTemplate[]): EmittedFile[] {
    const eventWorkflows = workflows.filter((w) => w.needsEventBridge);
    if (eventWorkflows.length === 0) return [];

    const manifest = buildAppManifest(serverName, workflows);
    const handlers = extractEventHandlers(eventWorkflows);
    const handlerBlocks = this.buildEventHandlerBlocks(handlers);

    return [
      {
        path: "rc-app/app.json",
        content: this.rcAppJsonCompiler({ manifest }),
      },
      {
        path: "rc-app/src/index.ts",
        content: this.rcAppIndexCompiler({ handlerBlocks }),
      },
      {
        path: "rc-app/tsconfig.json",
        content: this.rcAppTsconfigCompiler({}),
      },
      {
        path: "rc-app/package.json",
        content: this.rcAppPackageCompiler({ manifest }),
      },
    ];
  }

  private buildEventHandlerBlocks(handlers: Array<{
    event: string;
    filter: string | undefined;
    workflowId: string;
    methodName: string;
  }>): string {
    const lines: string[] = [];

    for (const h of handlers) {
      lines.push(`    try {`);
      if (h.filter) {
        lines.push(`      // ${h.filter}`);
      }
      lines.push(`      await http.post(CALLBACK_URL, {`);
      lines.push(`        data: {`);
      lines.push(`          event: "${h.event}",`);
      lines.push(`          workflow: "${h.workflowId}",`);
      lines.push(`          room: message.room,`);
      lines.push(`          sender: message.sender,`);
      lines.push(`          text: message.text,`);
      lines.push(`        },`);
      lines.push(`      });`);
      lines.push(`    } catch (e) {`);
      lines.push(`      this.getLogger().error("${h.methodName} failed:", e);`);
      lines.push(`    }`);
    }

    return lines.join("\n");
  }

  emitTool(workflow: WorkflowTemplate, provider: ProviderSpec): string {
    const toolBody = this.buildToolBody(workflow, provider);
    const schemaBlock = this.buildSchemaBlock(workflow);
    const handlerBlock = this.buildHandlerBlock(workflow, toolBody);

    return this.toolCompiler({
      workflow,
      schemaBlock,
      handlerBlock,
    });
  }

  private buildSchemaBlock(workflow: WorkflowTemplate): string {
    const lines = ["    {"];
    for (const input of workflow.inputs) {
      let zodType: string;
      switch (input.type) {
        case "string": zodType = "z.string()"; break;
        case "number": zodType = "z.number()"; break;
        case "boolean": zodType = "z.boolean()"; break;
        case "string[]": zodType = "z.array(z.string())"; break;
        default: zodType = "z.string()";
      }
      const desc = `.describe("${input.description}")`;
      const optional = input.required ? "" : ".optional()";
      lines.push(`      ${input.name}: ${zodType}${desc}${optional},`);
    }
    lines.push("    },");
    return lines.join("\n");
  }

  private buildHandlerBlock(workflow: WorkflowTemplate, toolBody: string): string {
    const params = workflow.inputs.map((i) => i.name).join(", ");
    const lines = [
      `    async ({ ${params} }) => {`,
      toolBody,
      "",
      "      const result = { success: true };",
      "      return {",
      '        content: [{ type: "text" as const, text: JSON.stringify(result) }],',
      "      };",
      "    },",
    ];
    return lines.join("\n");
  }

  private buildToolBody(workflow: WorkflowTemplate, provider: ProviderSpec): string {
    const executionOrder = this.resolveExecutionOrder(workflow);
    const lines: string[] = [];
    const decisionMap = this.buildDecisionMap(workflow.decisionPoints);
    const errorMap = this.buildErrorMap(workflow.errorHandlers);
    const emittedSteps = new Set<string>();

    for (const stepId of executionOrder) {
      if (emittedSteps.has(stepId)) continue;

      const decision = decisionMap.get(stepId);
      const step = workflow.steps.find((s) => s.id === stepId);
      if (!step) continue;

      const endpoint = provider.endpoints.find(
        (e) => e.operationId === step.operationId,
      );
      const errorHandler = errorMap.get(stepId);

      const stepCode = this.emitStepCode(step, endpoint, errorHandler);
      lines.push(stepCode);
      emittedSteps.add(stepId);

      if (decision) {
        const ifTrueCode = decision.ifTrue
          .filter((id) => !emittedSteps.has(id))
          .map((id) => {
            const s = workflow.steps.find((ws) => ws.id === id);
            if (!s) return "";
            const ep = provider.endpoints.find((e) => e.operationId === s.operationId);
            emittedSteps.add(id);
            return this.emitStepCode(s, ep, errorMap.get(id));
          })
          .join("\n");

        const ifFalseCode = decision.ifFalse
          .filter((id) => !emittedSteps.has(id))
          .map((id) => {
            const s = workflow.steps.find((ws) => ws.id === id);
            if (!s) return "";
            const ep = provider.endpoints.find((e) => e.operationId === s.operationId);
            emittedSteps.add(id);
            return this.emitStepCode(s, ep, errorMap.get(id));
          })
          .join("\n");

        lines.push(`  if (${decision.condition}) {`);
        lines.push(this.indent(ifTrueCode, 4));
        lines.push(`  } else {`);
        lines.push(this.indent(ifFalseCode, 4));
        lines.push(`  }`);
      }
    }

    return lines.join("\n");
  }

  private emitStepCode(
    step: WorkflowStep,
    endpoint: { method: string; path: string } | undefined,
    errorHandler?: ErrorHandler,
  ): string {
    const varName = this.stepVarName(step.id);
    const method = endpoint?.method?.toLowerCase() ?? "get";
    const path = endpoint?.path ?? `/api/v1/${step.operationId}`;

    const inputLines = Object.entries(step.inputMapping)
      .map(([key, source]) => {
        switch (source.type) {
          case "toolInput":
            return `      ${key}: ${source.field},`;
          case "stepOutput":
            return `      ${key}: ${this.stepVarName(source.stepId)}${source.path},`;
          case "literal":
            return `      ${key}: ${JSON.stringify(source.value)},`;
          case "expression":
            return `      ${key}: ${source.expr},`;
        }
      })
      .join("\n");

    const hasInputs = Object.keys(step.inputMapping).length > 0;
    const inputArg = hasInputs ? `, {\n${inputLines}\n    }` : "";

    const apiCall = `await client.${method}("${path}"${inputArg})`;

    if (errorHandler) {
      return this.wrapWithErrorHandler(step, varName, apiCall, errorHandler);
    }

    return `  const ${varName} = ${apiCall};`;
  }

  private wrapWithErrorHandler(
    step: WorkflowStep,
    varName: string,
    apiCall: string,
    handler: ErrorHandler,
  ): string {
    const lines: string[] = [];

    switch (handler.strategy) {
      case "skip":
        lines.push(`  let ${varName}: any = null;`);
        lines.push(`  try {`);
        lines.push(`    ${varName} = ${apiCall};`);
        lines.push(`  } catch (err) {`);
        lines.push(`  }`);
        break;

      case "retry":
        lines.push(`  let ${varName}: any = null;`);
        lines.push(`  for (let attempt = 0; attempt < ${handler.maxRetries ?? 3}; attempt++) {`);
        lines.push(`    try {`);
        lines.push(`      ${varName} = ${apiCall};`);
        lines.push(`      break;`);
        lines.push(`    } catch (err) {`);
        lines.push(`      if (attempt === ${(handler.maxRetries ?? 3) - 1}) throw err;`);
        lines.push(`    }`);
        lines.push(`  }`);
        break;

      case "rollback":
        lines.push(`  let ${varName}: any = null;`);
        lines.push(`  try {`);
        lines.push(`    ${varName} = ${apiCall};`);
        lines.push(`  } catch (err) {`);
        for (const rollbackStepId of handler.rollbackSteps ?? []) {
          lines.push(`    // rollback ${rollbackStepId}`);
        }
        lines.push(`    throw new Error(\`Step "${step.id}" failed, rolled back: \${err}\`);`);
        lines.push(`  }`);
        break;

      case "fail":
      default:
        lines.push(`  const ${varName} = ${apiCall};`);
        break;
    }

    return lines.join("\n");
  }

  private resolveExecutionOrder(workflow: WorkflowTemplate): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (stepId: string) => {
      if (visited.has(stepId)) return;
      visited.add(stepId);
      const step = workflow.steps.find((s) => s.id === stepId);
      if (!step) return;
      for (const dep of step.dependsOn ?? []) {
        visit(dep);
      }
      order.push(stepId);
    };

    for (const step of workflow.steps) {
      visit(step.id);
    }

    return order;
  }

  private buildDecisionMap(decisions: DecisionPoint[]): Map<string, DecisionPoint> {
    const map = new Map<string, DecisionPoint>();
    for (const d of decisions) {
      map.set(d.afterStep, d);
    }
    return map;
  }

  private buildErrorMap(handlers: ErrorHandler[]): Map<string, ErrorHandler> {
    const map = new Map<string, ErrorHandler>();
    for (const h of handlers) {
      map.set(h.forStep, h);
    }
    return map;
  }

  private stepVarName(stepId: string): string {
    return stepId.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }

  private indent(code: string, spaces: number): string {
    const pad = " ".repeat(spaces);
    return code
      .split("\n")
      .map((line) => (line.trim() ? pad + line.trimStart() : line))
      .join("\n");
  }
}
