import type { WorkflowTemplate } from "../../../types/index.js";

export const cicdNotifier: WorkflowTemplate = {
  id: "cicd-notifier",
  name: "CI/CD Notifier",
  intent: "Post CI/CD build and deployment notifications to the right channels based on status and severity, creating channels if they don't exist",
  keywords: [
    "cicd", "ci/cd", "build", "deploy", "deployment", "pipeline",
    "notification", "jenkins", "github actions", "notify",
  ],
  toolName: "rc_cicd_notify",
  toolDescription: "Post CI/CD notifications: routes to the right channel based on status (success/failure/warning), creates the channel if missing, and pins failure notifications.",
  inputs: [
    { name: "projectName", type: "string", description: "Project/repo name", required: true },
    { name: "status", type: "string", description: "Build status: success, failure, warning", required: true, enum: ["success", "failure", "warning"] },
    { name: "message", type: "string", description: "Notification message with build details", required: true },
    { name: "commitAuthor", type: "string", description: "Username of the commit author", required: false },
  ],
  steps: [
    {
      id: "resolve-channel",
      description: "Look up the notification channel for this project",
      operationId: "channels.info",
      inputMapping: {
        roomName: { type: "expression", expr: "`${projectName}-builds`" },
      },
    },
    {
      id: "create-channel",
      description: "Create the builds channel if it doesn't exist",
      operationId: "channels.create",
      inputMapping: {
        name: { type: "expression", expr: "`${projectName}-builds`" },
        members: { type: "literal", value: [] },
      },
    },
    {
      id: "post-notification",
      description: "Post the build notification to the channel",
      operationId: "chat.postMessage",
      inputMapping: {
        roomId: { type: "expression", expr: "channelId" },
        text: { type: "expression", expr: "formattedMessage" },
      },
      dependsOn: ["resolve-channel"],
    },
    {
      id: "pin-failure",
      description: "Pin the message if the build failed",
      operationId: "chat.pinMessage",
      inputMapping: {
        messageId: { type: "stepOutput", stepId: "post-notification", path: ".message._id" },
      },
      dependsOn: ["post-notification"],
    },
    {
      id: "dm-author",
      description: "DM the commit author about the failure",
      operationId: "chat.postMessage",
      inputMapping: {
        channel: { type: "expression", expr: "`@${commitAuthor}`" },
        text: { type: "expression", expr: "failureMessage" },
      },
      dependsOn: ["post-notification"],
    },
  ],
  decisionPoints: [
    {
      afterStep: "resolve-channel",
      condition: "resolveChannel?.channel != null",
      ifTrue: ["post-notification"],
      ifFalse: ["create-channel"],
    },
    {
      afterStep: "post-notification",
      condition: 'status === "failure"',
      ifTrue: ["pin-failure", "dm-author"],
      ifFalse: [],
    },
  ],
  errorHandlers: [
    { forStep: "resolve-channel", strategy: "skip" },
    { forStep: "create-channel", strategy: "fail" },
    { forStep: "post-notification", strategy: "retry", maxRetries: 3 },
    { forStep: "pin-failure", strategy: "skip" },
    { forStep: "dm-author", strategy: "skip" },
  ],
  rollbackHooks: [],
  requiredOperations: [
    "channels.info",
    "channels.create",
    "chat.postMessage",
    "chat.pinMessage",
  ],
  needsEventBridge: false,
};
