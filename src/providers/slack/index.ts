import type { ProviderSpec, ApiEndpoint, ApiCategory } from "@/types";
import type { WorkflowTemplate } from "@/types";

const SLACK_CATEGORIES: ApiCategory[] = [
  {
    id: "messaging",
    label: "Messaging",
    description: "Send and manage messages",
    operationIds: ["chat.postMessage", "chat.update", "chat.delete"],
  },
  {
    id: "channels",
    label: "Channels",
    description: "Create and manage channels",
    operationIds: ["conversations.create", "conversations.list", "conversations.info", "conversations.invite"],
  },
  {
    id: "users",
    label: "Users",
    description: "User management",
    operationIds: ["users.info", "users.list", "users.lookupByEmail"],
  },
];

const SLACK_ENDPOINTS: ApiEndpoint[] = [
  {
    operationId: "chat.postMessage",
    method: "POST",
    path: "/api/chat.postMessage",
    summary: "Send a message to a channel",
    category: "messaging",
    parameters: [],
    requestBody: { contentType: "application/json", schema: { channel: "string", text: "string" }, required: true },
    requiresAuth: true,
  },
  {
    operationId: "conversations.create",
    method: "POST",
    path: "/api/conversations.create",
    summary: "Create a channel",
    category: "channels",
    parameters: [],
    requestBody: { contentType: "application/json", schema: { name: "string", is_private: "boolean" }, required: true },
    requiresAuth: true,
  },
  {
    operationId: "conversations.list",
    method: "GET",
    path: "/api/conversations.list",
    summary: "List all channels",
    category: "channels",
    parameters: [],
    requiresAuth: true,
  },
  {
    operationId: "conversations.info",
    method: "GET",
    path: "/api/conversations.info",
    summary: "Get channel info",
    category: "channels",
    parameters: [{ name: "channel", in: "query", description: "Channel ID", required: true, type: "string" }],
    requiresAuth: true,
  },
  {
    operationId: "conversations.invite",
    method: "POST",
    path: "/api/conversations.invite",
    summary: "Invite user to channel",
    category: "channels",
    parameters: [],
    requestBody: { contentType: "application/json", schema: { channel: "string", users: "string" }, required: true },
    requiresAuth: true,
  },
  {
    operationId: "users.info",
    method: "GET",
    path: "/api/users.info",
    summary: "Get user info",
    category: "users",
    parameters: [{ name: "user", in: "query", description: "User ID", required: true, type: "string" }],
    requiresAuth: true,
  },
  {
    operationId: "users.list",
    method: "GET",
    path: "/api/users.list",
    summary: "List all users",
    category: "users",
    parameters: [],
    requiresAuth: true,
  },
  {
    operationId: "users.lookupByEmail",
    method: "GET",
    path: "/api/users.lookupByEmail",
    summary: "Find user by email",
    category: "users",
    parameters: [{ name: "email", in: "query", description: "Email", required: true, type: "string" }],
    requiresAuth: true,
  },
];

const slackOnboardMember: WorkflowTemplate = {
  id: "slack-onboard-member",
  name: "Slack Onboard Member",
  intent: "Onboard a new team member on Slack by inviting them to the right channels based on their role",
  keywords: ["onboard", "invite", "new member", "slack", "channels"],
  toolName: "slack_onboard_member",
  toolDescription: "Invite a new member to role-appropriate Slack channels and send a welcome DM.",
  inputs: [
    { name: "email", type: "string", description: "Member's email address", required: true },
    { name: "role", type: "string", description: "Team role: engineering, design, or default", required: true },
  ],
  steps: [
    { id: "lookup-user", description: "Find user by email", operationId: "users.lookupByEmail", inputMapping: { email: { type: "toolInput", field: "email" } } },
    { id: "invite-channels", description: "Invite to role channels", operationId: "conversations.invite", inputMapping: {}, dependsOn: ["lookup-user"] },
    { id: "send-welcome", description: "Send welcome DM", operationId: "chat.postMessage", inputMapping: {}, dependsOn: ["invite-channels"] },
  ],
  decisionPoints: [
    { afterStep: "lookup-user", condition: "user not found", ifTrue: [], ifFalse: ["invite-channels"] },
  ],
  errorHandlers: [
    { forStep: "lookup-user", strategy: "fail" },
    { forStep: "invite-channels", strategy: "skip" },
    { forStep: "send-welcome", strategy: "skip" },
  ],
  rollbackHooks: [],
  requiredOperations: ["users.lookupByEmail", "conversations.invite", "chat.postMessage"],
  needsEventBridge: false,
};

const slackNotifier: WorkflowTemplate = {
  id: "slack-notifier",
  name: "Slack Notifier",
  intent: "Send notifications to Slack channels based on event type",
  keywords: ["notify", "alert", "slack", "notification", "message"],
  toolName: "slack_notify",
  toolDescription: "Send a notification to a Slack channel, creating it if missing.",
  inputs: [
    { name: "channelName", type: "string", description: "Channel to notify", required: true },
    { name: "message", type: "string", description: "Notification text", required: true },
  ],
  steps: [
    { id: "find-channel", description: "Look up channel", operationId: "conversations.info", inputMapping: {} },
    { id: "create-channel", description: "Create if missing", operationId: "conversations.create", inputMapping: {} },
    { id: "post-message", description: "Post notification", operationId: "chat.postMessage", inputMapping: {} },
  ],
  decisionPoints: [
    { afterStep: "find-channel", condition: "channel not found", ifTrue: ["create-channel"], ifFalse: [] },
  ],
  errorHandlers: [
    { forStep: "find-channel", strategy: "skip" },
    { forStep: "create-channel", strategy: "fail" },
    { forStep: "post-message", strategy: "fail" },
  ],
  rollbackHooks: [],
  requiredOperations: ["conversations.info", "conversations.create", "chat.postMessage"],
  needsEventBridge: false,
};

export function createSlackProvider(): ProviderSpec {
  return {
    name: "slack",
    displayName: "Slack",
    baseUrl: "https://slack.com",
    authScheme: {
      type: "apiKey",
      headerName: "Authorization",
    },
    categories: SLACK_CATEGORIES,
    endpoints: SLACK_ENDPOINTS,
    workflowTemplates: [slackOnboardMember, slackNotifier],
  };
}
