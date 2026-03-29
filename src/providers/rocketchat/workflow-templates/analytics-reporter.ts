import type { WorkflowTemplate } from "../../../types/index.js";

export const analyticsReporter: WorkflowTemplate = {
  id: "analytics-reporter",
  name: "Analytics Reporter",
  intent: "Collect server statistics and channel activity, compile a report, and post it to a designated channel",
  keywords: [
    "analytics", "statistics", "report", "metrics", "dashboard",
    "usage", "activity",
  ],
  toolName: "rc_analytics_report",
  toolDescription: "Generate an analytics report: fetches server stats, channel activity data, and posts a formatted summary to the designated channel.",
  inputs: [
    { name: "reportChannelName", type: "string", description: "Channel to post the report to", required: true },
    { name: "includeUserStats", type: "boolean", description: "Include user activity statistics", required: false },
  ],
  steps: [
    {
      id: "get-stats",
      description: "Fetch server statistics",
      operationId: "statistics",
      inputMapping: {},
    },
    {
      id: "get-channels",
      description: "List all channels for activity data",
      operationId: "channels.list",
      inputMapping: {},
    },
    {
      id: "get-users",
      description: "List users for activity stats (if requested)",
      operationId: "users.list",
      inputMapping: {},
      dependsOn: ["get-stats"],
    },
    {
      id: "post-report",
      description: "Post the compiled analytics report",
      operationId: "chat.postMessage",
      inputMapping: {
        channel: { type: "toolInput", field: "reportChannelName" },
        text: { type: "expression", expr: "reportText" },
      },
      dependsOn: ["get-stats", "get-channels"],
    },
  ],
  decisionPoints: [
    {
      afterStep: "get-stats",
      condition: "includeUserStats === true",
      ifTrue: ["get-users"],
      ifFalse: [],
    },
  ],
  errorHandlers: [
    { forStep: "get-stats", strategy: "fail" },
    { forStep: "get-channels", strategy: "skip" },
    { forStep: "get-users", strategy: "skip" },
    { forStep: "post-report", strategy: "retry", maxRetries: 2 },
  ],
  rollbackHooks: [],
  requiredOperations: ["statistics", "channels.list", "users.list", "chat.postMessage"],
  needsEventBridge: false,
};
