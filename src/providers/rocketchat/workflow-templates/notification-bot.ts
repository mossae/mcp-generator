import type { WorkflowTemplate } from "../../../types/index.js";

export const notificationBot: WorkflowTemplate = {
  id: "notification-bot",
  name: "Notification Bot",
  intent: "Send targeted notifications to users or channels based on conditions, with delivery confirmation",
  keywords: [
    "notify", "notification", "alert", "broadcast", "announce",
    "bot", "send alert",
  ],
  toolName: "rc_send_notification",
  toolDescription: "Send a notification to a user or channel. Supports broadcast to multiple channels and DM fallback if channel delivery fails.",
  inputs: [
    { name: "targets", type: "string[]", description: "Channel names or @usernames to notify", required: true },
    { name: "message", type: "string", description: "Notification message", required: true },
    { name: "urgent", type: "boolean", description: "Mark as urgent (pins the message)", required: false },
  ],
  steps: [
    {
      id: "send-to-targets",
      description: "Send the notification to each target",
      operationId: "chat.postMessage",
      inputMapping: {
        channel: { type: "expression", expr: "target" },
        text: { type: "toolInput", field: "message" },
      },
    },
    {
      id: "pin-urgent",
      description: "Pin the message if urgent",
      operationId: "chat.pinMessage",
      inputMapping: {
        messageId: { type: "expression", expr: "sentMessageId" },
      },
      dependsOn: ["send-to-targets"],
    },
  ],
  decisionPoints: [
    {
      afterStep: "send-to-targets",
      condition: "urgent === true",
      ifTrue: ["pin-urgent"],
      ifFalse: [],
    },
  ],
  errorHandlers: [
    { forStep: "send-to-targets", strategy: "skip" },
    { forStep: "pin-urgent", strategy: "skip" },
  ],
  rollbackHooks: [],
  requiredOperations: ["chat.postMessage", "chat.pinMessage"],
  needsEventBridge: false,
};
