import type { WorkflowTemplate } from "../../../types/index.js";

export const contentModeration: WorkflowTemplate = {
  id: "content-moderation",
  name: "Content Moderation",
  intent: "Review reported content, take action based on severity (warn user, delete message, deactivate account), and log the moderation action",
  keywords: [
    "moderation", "moderate", "report", "ban", "warn", "delete message",
    "abuse", "spam", "flag", "content review",
  ],
  toolName: "rc_moderate_content",
  toolDescription: "Review and act on reported content: fetches reports, decides action based on severity (warn/delete/deactivate), and logs the result to a moderation channel.",
  inputs: [
    { name: "userId", type: "string", description: "The reported user's ID", required: true },
    { name: "severity", type: "string", description: "Severity level: low, medium, high", required: true, enum: ["low", "medium", "high"] },
    { name: "moderationChannelName", type: "string", description: "Channel to log moderation actions", required: false, default: "moderation-log" },
  ],
  steps: [
    {
      id: "get-reports",
      description: "Fetch moderation reports for this user",
      operationId: "moderation.reportsByUsers",
      inputMapping: {},
    },
    {
      id: "get-user-info",
      description: "Get the reported user's info",
      operationId: "users.info",
      inputMapping: {
        userId: { type: "toolInput", field: "userId" },
      },
    },
    {
      id: "warn-user",
      description: "Send a warning DM to the user (low severity)",
      operationId: "chat.postMessage",
      inputMapping: {
        channel: { type: "expression", expr: "`@${userInfo.user.username}`" },
        text: { type: "literal", value: "Your recent content has been flagged. Please review our community guidelines." },
      },
      dependsOn: ["get-user-info"],
    },
    {
      id: "dismiss-reports",
      description: "Dismiss the reports after warning",
      operationId: "moderation.dismissReports",
      inputMapping: {
        userId: { type: "toolInput", field: "userId" },
      },
      dependsOn: ["warn-user"],
    },
    {
      id: "deactivate-user",
      description: "Deactivate the user account (high severity)",
      operationId: "users.setActiveStatus",
      inputMapping: {
        activeStatus: { type: "literal", value: false },
        userId: { type: "toolInput", field: "userId" },
      },
      dependsOn: ["get-user-info"],
    },
    {
      id: "log-action",
      description: "Log the moderation action to the moderation channel",
      operationId: "chat.postMessage",
      inputMapping: {
        channel: { type: "toolInput", field: "moderationChannelName" },
        text: { type: "expression", expr: "logMessage" },
      },
      dependsOn: ["get-user-info"],
    },
  ],
  decisionPoints: [
    {
      afterStep: "get-user-info",
      condition: 'severity === "low" || severity === "medium"',
      ifTrue: ["warn-user"],
      ifFalse: ["deactivate-user"],
    },
  ],
  errorHandlers: [
    { forStep: "get-reports", strategy: "fail" },
    { forStep: "get-user-info", strategy: "fail" },
    { forStep: "warn-user", strategy: "skip" },
    { forStep: "dismiss-reports", strategy: "skip" },
    { forStep: "deactivate-user", strategy: "fail" },
    { forStep: "log-action", strategy: "skip" },
  ],
  rollbackHooks: [
    {
      triggerOnFailure: "deactivate-user",
      steps: [],
    },
  ],
  requiredOperations: [
    "moderation.reportsByUsers",
    "moderation.dismissReports",
    "users.info",
    "users.setActiveStatus",
    "chat.postMessage",
  ],
  needsEventBridge: true,
  eventSubscriptions: [
    { event: "message", filter: "flagged content", triggerStep: "get-reports" },
  ],
};
