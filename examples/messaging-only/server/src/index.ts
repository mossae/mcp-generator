import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "./client.js";
import { registerMinimalChatbot } from "./tools/minimal-chatbot.js";

const server = new McpServer({
  name: "rc-messaging-mcp",
  version: "1.0.0",
});

const client = createClient();

registerMinimalChatbot(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
