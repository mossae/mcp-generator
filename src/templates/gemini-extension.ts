export const geminiExtensionTemplate = `{
  "name": "{{serverName}}",
  "version": "{{serverVersion}}",
  "description": "Minimal Rocket.Chat MCP server ({{workflowCount}} tools, ~{{totalTokens}} tokens)",
  "mcpServers": {
    "rocketchat": {
      "command": "node",
      "args": ["\${extensionPath}/server/dist/index.js"],
      "env": {
        "RC_URL": "\${RC_URL}",
        "RC_AUTH_TOKEN": "\${RC_AUTH_TOKEN}",
        "RC_USER_ID": "\${RC_USER_ID}"
      }
    }
  }
}
`;
