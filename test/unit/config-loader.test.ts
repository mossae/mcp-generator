import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { findConfigFile, loadConfig, resolveConfig } from "@/cli/config-loader";

const TEST_DIR = path.join(process.cwd(), "test-config-tmp");

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("config-loader", () => {
  it("finds .mcp-generator.yaml", () => {
    fs.writeFileSync(path.join(TEST_DIR, ".mcp-generator.yaml"), "provider: rocketchat");
    expect(findConfigFile(TEST_DIR)).toBe(path.join(TEST_DIR, ".mcp-generator.yaml"));
  });

  it("finds .mcp-generator.yml", () => {
    fs.writeFileSync(path.join(TEST_DIR, ".mcp-generator.yml"), "provider: rocketchat");
    expect(findConfigFile(TEST_DIR)).toBe(path.join(TEST_DIR, ".mcp-generator.yml"));
  });

  it("returns null when no config exists", () => {
    expect(findConfigFile(TEST_DIR)).toBeNull();
  });

  it("loads and parses yaml config", () => {
    const yaml = `
provider: rocketchat
workflows:
  - onboard-team-member
  - minimal-chatbot
output: ./my-server
name: my-rc-mcp
`;
    fs.writeFileSync(path.join(TEST_DIR, ".mcp-generator.yaml"), yaml);
    const raw = loadConfig(path.join(TEST_DIR, ".mcp-generator.yaml"));

    expect(raw.provider).toBe("rocketchat");
    expect(raw.workflows).toEqual(["onboard-team-member", "minimal-chatbot"]);
    expect(raw.output).toBe("./my-server");
    expect(raw.name).toBe("my-rc-mcp");
  });

  it("loads capabilities-based config", () => {
    const yaml = `
provider: rocketchat
capabilities:
  - onboard new team members
  - send CI/CD notifications
output: ./my-server
`;
    fs.writeFileSync(path.join(TEST_DIR, ".mcp-generator.yaml"), yaml);
    const raw = loadConfig(path.join(TEST_DIR, ".mcp-generator.yaml"));

    expect(raw.capabilities).toEqual([
      "onboard new team members",
      "send CI/CD notifications",
    ]);
  });

  it("resolves config with defaults", () => {
    const resolved = resolveConfig({});

    expect(resolved.provider).toBe("rocketchat");
    expect(resolved.outputDir).toBe("./generated-mcp-server");
    expect(resolved.serverName).toBe("rocketchat-mcp");
    expect(resolved.serverVersion).toBe("1.0.0");
    expect(resolved.selectedWorkflows).toEqual([]);
  });

  it("resolves config with overrides", () => {
    const resolved = resolveConfig({
      provider: "rocketchat",
      workflows: ["minimal-chatbot"],
      output: "./custom",
      name: "custom-mcp",
      version: "2.0.0",
      eventBridge: true,
    });

    expect(resolved.outputDir).toBe("./custom");
    expect(resolved.serverName).toBe("custom-mcp");
    expect(resolved.serverVersion).toBe("2.0.0");
    expect(resolved.includeEventBridge).toBe(true);
    expect(resolved.selectedWorkflows).toEqual(["minimal-chatbot"]);
  });
});
