/**
 * Tool template for generated MCP tools.
 * We avoid Handlebars brace conflicts by pre-building complex sections
 * in the CodeEmitter and passing them as raw strings ({{{triple braces}}}).
 */
export const toolTemplate = `import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RocketChatClient } from "../client.js";

/**
 * {{workflow.name}}
 * {{workflow.intent}}
 */
export function register{{pascalCase workflow.id}}(
  server: McpServer,
  client: RocketChatClient,
): void {
  server.tool(
    "{{workflow.toolName}}",
    "{{workflow.toolDescription}}",
{{{schemaBlock}}}
{{{handlerBlock}}}
  );
}
`;
