import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "./client.js";
import { registerOnboardTeamMember } from "./tools/onboard-team-member.js";
import { registerChannelManagement } from "./tools/channel-management.js";
import { registerContentModeration } from "./tools/content-moderation.js";

const server = new McpServer({
  name: "rc-admin-mcp",
  version: "1.0.0",
});

const client = createClient();

registerOnboardTeamMember(server, client);
registerChannelManagement(server, client);
registerContentModeration(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
