import { describe, it, expect } from "vitest";
import { Generator } from "../../src/core/generator.js";
import { TokenCounter } from "../../src/core/token-counter.js";
import { createRocketChatProvider } from "../../src/providers/rocketchat/index.js";
import type { GeneratorConfig } from "../../src/types/index.js";

describe("Generator", () => {
  const provider = createRocketChatProvider();
  const generator = new Generator();

  it("generates a complete project for onboard-team-member workflow", () => {
    const config: GeneratorConfig = {
      provider: "rocketchat",
      selectedWorkflows: ["onboard-team-member"],
      outputDir: "./test-output",
      includeEventBridge: false,
      serverName: "test-rc-mcp",
      serverVersion: "1.0.0",
    };

    const result = generator.generateInMemory(provider, config);

    // Should produce the right files
    const filePaths = result.files.map((f) => f.path);
    expect(filePaths).toContain("server/src/tools/onboard-team-member.ts");
    expect(filePaths).toContain("server/src/index.ts");
    expect(filePaths).toContain("server/src/client.ts");
    expect(filePaths).toContain("package.json");
    expect(filePaths).toContain("server/tsconfig.json");
    expect(filePaths).toContain(".env.example");

    // Tool file should contain decision logic, not just API calls
    const toolFile = result.files.find((f) =>
      f.path.includes("onboard-team-member.ts"),
    );
    expect(toolFile).toBeDefined();
    expect(toolFile!.content).toContain("if (");
    expect(toolFile!.content).toContain("try {");
    expect(toolFile!.content).toContain("catch");
    expect(toolFile!.content).toContain("rc_onboard_team_member");
  });

  it("generates server entry that imports only selected workflows", () => {
    const config: GeneratorConfig = {
      provider: "rocketchat",
      selectedWorkflows: ["minimal-chatbot", "notification-bot"],
      outputDir: "./test-output",
      includeEventBridge: false,
      serverName: "test-rc-mcp",
      serverVersion: "1.0.0",
    };

    const result = generator.generateInMemory(provider, config);
    const serverFile = result.files.find((f) => f.path === "server/src/index.ts");
    expect(serverFile).toBeDefined();

    // Should import only the two selected workflows
    expect(serverFile!.content).toContain("minimal-chatbot");
    expect(serverFile!.content).toContain("notification-bot");
    // Should NOT import unselected workflows
    expect(serverFile!.content).not.toContain("onboard-team-member");
    expect(serverFile!.content).not.toContain("cicd-notifier");
  });

  it("throws for unknown workflow IDs", () => {
    const config: GeneratorConfig = {
      provider: "rocketchat",
      selectedWorkflows: ["nonexistent-workflow"],
      outputDir: "./test-output",
      includeEventBridge: false,
      serverName: "test-rc-mcp",
      serverVersion: "1.0.0",
    };

    expect(() => generator.generateInMemory(provider, config)).toThrow(
      "No workflows matched",
    );
  });

  it("produces token savings report", () => {
    const config: GeneratorConfig = {
      provider: "rocketchat",
      selectedWorkflows: ["minimal-chatbot"],
      outputDir: "./test-output",
      includeEventBridge: false,
      serverName: "test-rc-mcp",
      serverVersion: "1.0.0",
    };

    const result = generator.generateInMemory(provider, config);

    expect(result.tokenReport.selectedTools).toBe(1);
    expect(result.tokenReport.totalTools).toBe(12);
    expect(result.tokenReport.savedTokens).toBeGreaterThan(0);
    expect(parseFloat(result.tokenReport.savingsPercent)).toBeGreaterThan(80);
  });

  it("generates all 12 workflows without errors", () => {
    for (const workflow of provider.workflowTemplates) {
      const config: GeneratorConfig = {
        provider: "rocketchat",
        selectedWorkflows: [workflow.id],
        outputDir: "./test-output",
        includeEventBridge: false,
        serverName: "test-rc-mcp",
        serverVersion: "1.0.0",
      };

      const result = generator.generateInMemory(provider, config);
      expect(result.files.length).toBeGreaterThan(0);

      // Every generated tool file should be non-empty
      const toolFile = result.files.find((f) =>
        f.path.includes(`tools/${workflow.id}.ts`),
      );
      expect(toolFile, `Missing tool file for ${workflow.id}`).toBeDefined();
      expect(toolFile!.content.length).toBeGreaterThan(100);
    }
  });
});

describe("TokenCounter", () => {
  const provider = createRocketChatProvider();
  const counter = new TokenCounter();

  it("counts tokens for a workflow", () => {
    const workflow = provider.workflowTemplates.find(
      (w) => w.id === "onboard-team-member",
    )!;
    const tokens = counter.countWorkflow(workflow);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(1000);
  });

  it("shows significant savings for minimal selection", () => {
    const minimal = provider.workflowTemplates.filter(
      (w) => w.id === "minimal-chatbot",
    );
    const report = counter.compare(minimal, provider.workflowTemplates);

    expect(report.selectedTools).toBe(1);
    expect(report.totalTools).toBe(12);
    expect(parseFloat(report.savingsPercent)).toBeGreaterThan(80);
  });

  it("formats a readable report", () => {
    const selected = provider.workflowTemplates.filter(
      (w) => w.id === "onboard-team-member" || w.id === "cicd-notifier",
    );
    const report = counter.compare(selected, provider.workflowTemplates);
    const formatted = counter.formatReport(report);

    expect(formatted).toContain("Token Savings Report");
    expect(formatted).toContain("2 tools / 12 total");
    expect(formatted).toContain("rc_onboard_team_member");
    expect(formatted).toContain("rc_cicd_notify");
  });
});
