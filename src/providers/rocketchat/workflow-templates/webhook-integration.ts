import type { WorkflowTemplate } from "../../../types/index.js";

export const webhookIntegration: WorkflowTemplate = {
  id: "webhook-integration",
  name: "Webhook Integration Setup",
  intent: "Create and manage incoming/outgoing webhook integrations for external service connections",
  keywords: [
    "webhook", "integration", "incoming", "outgoing", "external",
    "api", "connect", "hook",
  ],
  toolName: "rc_setup_webhook",
  toolDescription: "Set up a webhook integration: creates an incoming or outgoing webhook, configures it for a channel, and verifies it's active.",
  inputs: [
    { name: "name", type: "string", description: "Integration name", required: true },
    { name: "channelName", type: "string", description: "Target channel for the webhook", required: true },
    { name: "webhookUrl", type: "string", description: "External URL (for outgoing webhooks)", required: false },
    { name: "scriptEnabled", type: "boolean", description: "Enable custom script processing", required: false },
  ],
  steps: [
    {
      id: "check-channel",
      description: "Verify the target channel exists",
      operationId: "channels.info",
      inputMapping: {
        roomName: { type: "toolInput", field: "channelName" },
      },
    },
    {
      id: "list-existing",
      description: "Check for existing integrations to avoid duplicates",
      operationId: "integrations.list",
      inputMapping: {},
      dependsOn: ["check-channel"],
    },
    {
      id: "create-integration",
      description: "Create the webhook integration",
      operationId: "integrations.create",
      inputMapping: {
        type: { type: "literal", value: "webhook-incoming" },
        name: { type: "toolInput", field: "name" },
        channel: { type: "expression", expr: "`#${channelName}`" },
        scriptEnabled: { type: "toolInput", field: "scriptEnabled" },
        event: { type: "literal", value: "sendMessage" },
      },
      dependsOn: ["list-existing"],
    },
    {
      id: "notify-channel",
      description: "Post a notification that the integration is active",
      operationId: "chat.postMessage",
      inputMapping: {
        channel: { type: "toolInput", field: "channelName" },
        text: { type: "expression", expr: "`Webhook integration '${name}' is now active.`" },
      },
      dependsOn: ["create-integration"],
    },
  ],
  decisionPoints: [],
  errorHandlers: [
    { forStep: "check-channel", strategy: "fail" },
    { forStep: "list-existing", strategy: "skip" },
    { forStep: "create-integration", strategy: "fail" },
    { forStep: "notify-channel", strategy: "skip" },
  ],
  rollbackHooks: [],
  requiredOperations: ["channels.info", "integrations.list", "integrations.create", "chat.postMessage"],
  needsEventBridge: false,
};
