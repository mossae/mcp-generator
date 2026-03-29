export const serverTemplate = `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "./client.js";
{{#each workflows}}
import { register{{pascalCase id}} } from "./tools/{{id}}.js";
{{/each}}

const server = new McpServer({
  name: "{{serverName}}",
  version: "{{serverVersion}}",
});

const client = createClient();

{{#each workflows}}
register{{pascalCase id}}(server, client);
{{/each}}

const transport = new StdioServerTransport();
await server.connect(transport);
`;
