export interface GeneratorConfig {
  /** Which provider to generate for */
  provider: string;
  /** Selected workflow IDs or capability descriptions */
  selectedWorkflows: string[];
  /** Output directory for the generated server */
  outputDir: string;
  /** Whether to include the RC App event bridge */
  includeEventBridge: boolean;
  /** Server name for the generated MCP server */
  serverName: string;
  /** Server version */
  serverVersion: string;
}
