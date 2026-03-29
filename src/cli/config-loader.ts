import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseYaml } from "yaml";
import type { GeneratorConfig } from "@/types";

interface RawConfig {
  provider?: string;
  workflows?: string[];
  capabilities?: string[];
  output?: string;
  name?: string;
  version?: string;
  eventBridge?: boolean;
}

const CONFIG_FILENAMES = [
  ".mcp-generator.yaml",
  ".mcp-generator.yml",
  "mcp-generator.config.yaml",
  "mcp-generator.config.yml",
];

export function findConfigFile(dir: string = process.cwd()): string | null {
  for (const name of CONFIG_FILENAMES) {
    const filePath = path.join(dir, name);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

export function loadConfig(filePath: string): RawConfig {
  const content = fs.readFileSync(filePath, "utf-8");
  return parseYaml(content) as RawConfig;
}

export function resolveConfig(raw: RawConfig): Partial<GeneratorConfig> {
  return {
    provider: raw.provider ?? "rocketchat",
    selectedWorkflows: raw.workflows ?? [],
    outputDir: raw.output ?? "./generated-mcp-server",
    includeEventBridge: raw.eventBridge ?? false,
    serverName: raw.name ?? "rocketchat-mcp",
    serverVersion: raw.version ?? "1.0.0",
  };
}

export function loadAndResolve(dir?: string): { config: Partial<GeneratorConfig>; capabilities?: string[]; filePath: string } | null {
  const filePath = findConfigFile(dir);
  if (!filePath) return null;

  const raw = loadConfig(filePath);
  const config = resolveConfig(raw);

  return {
    config,
    capabilities: raw.capabilities,
    filePath,
  };
}
