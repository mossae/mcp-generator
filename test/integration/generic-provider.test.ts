import { describe, it, expect } from "vitest";
import { Generator } from "@/core/generator";
import { createSlackProvider } from "@/providers/slack";
import { createRocketChatProvider } from "@/providers/rocketchat";
import type { GeneratorConfig } from "@/types";

describe("Generic Provider Architecture", () => {
  const slackProvider = createSlackProvider();
  const generator = new Generator();

  it("Slack provider conforms to ProviderSpec", () => {
    expect(slackProvider.name).toBe("slack");
    expect(slackProvider.displayName).toBe("Slack");
    expect(slackProvider.authScheme.type).toBe("apiKey");
    expect(slackProvider.categories.length).toBeGreaterThan(0);
    expect(slackProvider.endpoints.length).toBeGreaterThan(0);
    expect(slackProvider.workflowTemplates.length).toBeGreaterThan(0);
  });

  it("generator works with Slack provider without code changes", () => {
    const config: GeneratorConfig = {
      provider: "slack",
      selectedWorkflows: ["slack-onboard-member"],
      outputDir: "./test-output",
      includeEventBridge: false,
      serverName: "slack-mcp",
      serverVersion: "1.0.0",
    };

    const result = generator.generateInMemory(slackProvider, config);

    expect(result.files.length).toBeGreaterThan(0);
    const toolFile = result.files.find((f) => f.path.includes("slack-onboard-member"));
    expect(toolFile).toBeDefined();
    expect(toolFile!.content).toContain("slack_onboard_member");
  });

  it("Slack token report compares against full Slack API", () => {
    const config: GeneratorConfig = {
      provider: "slack",
      selectedWorkflows: ["slack-notifier"],
      outputDir: "./test-output",
      includeEventBridge: false,
      serverName: "slack-mcp",
      serverVersion: "1.0.0",
    };

    const result = generator.generateInMemory(slackProvider, config);
    expect(result.tokenReport.selectedTools).toBe(1);
    expect(result.tokenReport.savedTokens).toBeGreaterThan(0);
  });

  it("same generator produces different output for RC vs Slack", () => {
    const rcConfig: GeneratorConfig = {
      provider: "rocketchat",
      selectedWorkflows: ["minimal-chatbot"],
      outputDir: "./test-output",
      includeEventBridge: false,
      serverName: "rc-mcp",
      serverVersion: "1.0.0",
    };

    const slackConfig: GeneratorConfig = {
      provider: "slack",
      selectedWorkflows: ["slack-notifier"],
      outputDir: "./test-output",
      includeEventBridge: false,
      serverName: "slack-mcp",
      serverVersion: "1.0.0",
    };

    const rcResult = generator.generateInMemory(createRocketChatProvider(), rcConfig);
    const slackResult = generator.generateInMemory(slackProvider, slackConfig);

    const rcTool = rcResult.files.find((f) => f.path.includes("tools/"));
    const slackTool = slackResult.files.find((f) => f.path.includes("tools/"));

    expect(rcTool!.content).toContain("rc_chatbot_reply");
    expect(slackTool!.content).toContain("slack_notify");
    expect(rcTool!.content).not.toContain("slack");
    expect(slackTool!.content).not.toContain("rocketchat");
  });
});
