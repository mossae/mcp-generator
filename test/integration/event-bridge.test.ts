import { describe, it, expect } from "vitest";
import { Generator } from "@/core/generator";
import { createRocketChatProvider } from "@/providers/rocketchat";
import type { GeneratorConfig } from "@/types";

describe("Event Bridge", () => {
  const provider = createRocketChatProvider();
  const generator = new Generator();

  it("generates rc-app files for workflows with needsEventBridge", () => {
    const config: GeneratorConfig = {
      provider: "rocketchat",
      selectedWorkflows: ["content-moderation"],
      outputDir: "./test-output",
      includeEventBridge: false,
      serverName: "test-rc-mcp",
      serverVersion: "1.0.0",
    };

    const result = generator.generateInMemory(provider, config);
    const paths = result.files.map((f) => f.path);

    expect(paths).toContain("rc-app/app.json");
    expect(paths).toContain("rc-app/src/index.ts");
    expect(paths).toContain("rc-app/tsconfig.json");
    expect(paths).toContain("rc-app/package.json");
  });

  it("rc-app app.json has correct manifest", () => {
    const config: GeneratorConfig = {
      provider: "rocketchat",
      selectedWorkflows: ["content-moderation"],
      outputDir: "./test-output",
      includeEventBridge: false,
      serverName: "test-rc-mcp",
      serverVersion: "1.0.0",
    };

    const result = generator.generateInMemory(provider, config);
    const appJson = result.files.find((f) => f.path === "rc-app/app.json");
    const manifest = JSON.parse(appJson!.content);

    expect(manifest.id).toBe("test-rc-mcp-event-bridge");
    expect(manifest.name).toBe("test-rc-mcp Event Bridge");
    expect(manifest.classFile).toBe("dist/index.js");
  });

  it("rc-app index.ts contains event handler with callback", () => {
    const config: GeneratorConfig = {
      provider: "rocketchat",
      selectedWorkflows: ["content-moderation"],
      outputDir: "./test-output",
      includeEventBridge: false,
      serverName: "test-rc-mcp",
      serverVersion: "1.0.0",
    };

    const result = generator.generateInMemory(provider, config);
    const index = result.files.find((f) => f.path === "rc-app/src/index.ts");

    expect(index!.content).toContain("CALLBACK_URL");
    expect(index!.content).toContain("content-moderation");
    expect(index!.content).toContain("http.post");
    expect(index!.content).toContain("EventBridgeApp");
  });

  it("does not generate rc-app for workflows without events", () => {
    const config: GeneratorConfig = {
      provider: "rocketchat",
      selectedWorkflows: ["minimal-chatbot"],
      outputDir: "./test-output",
      includeEventBridge: false,
      serverName: "test-rc-mcp",
      serverVersion: "1.0.0",
    };

    const result = generator.generateInMemory(provider, config);
    const paths = result.files.map((f) => f.path);

    expect(paths.some((p) => p.startsWith("rc-app/"))).toBe(false);
  });

  it("generates rc-app when includeEventBridge is forced", () => {
    const config: GeneratorConfig = {
      provider: "rocketchat",
      selectedWorkflows: ["customer-support-bot", "content-moderation"],
      outputDir: "./test-output",
      includeEventBridge: true,
      serverName: "support-mcp",
      serverVersion: "1.0.0",
    };

    const result = generator.generateInMemory(provider, config);
    const index = result.files.find((f) => f.path === "rc-app/src/index.ts");

    expect(index).toBeDefined();
    expect(index!.content).toContain("customer-support-bot");
    expect(index!.content).toContain("content-moderation");
  });

  it("monorepo output has both server/ and rc-app/ directories", () => {
    const config: GeneratorConfig = {
      provider: "rocketchat",
      selectedWorkflows: ["content-moderation", "minimal-chatbot"],
      outputDir: "./test-output",
      includeEventBridge: false,
      serverName: "test-rc-mcp",
      serverVersion: "1.0.0",
    };

    const result = generator.generateInMemory(provider, config);
    const paths = result.files.map((f) => f.path);

    const hasServer = paths.some((p) => p.startsWith("server/"));
    const hasRcApp = paths.some((p) => p.startsWith("rc-app/"));

    expect(hasServer).toBe(true);
    expect(hasRcApp).toBe(true);
  });
});
