import type { WorkflowTemplate } from "../../../types/index.js";

export const minimalChatbot: WorkflowTemplate = {
  id: "minimal-chatbot",
  name: "Minimal Chatbot",
  intent: "The absolute minimum: read messages from a channel and post replies. Baseline for token savings comparison.",
  keywords: [
    "chatbot", "bot", "reply", "respond", "simple bot",
    "echo", "minimal",
  ],
  toolName: "rc_chatbot_reply",
  toolDescription: "Read recent messages from a channel and post a reply. The simplest possible workflow for baseline token comparison.",
  inputs: [
    { name: "channelName", type: "string", description: "Channel to read from and reply to", required: true },
    { name: "replyText", type: "string", description: "Reply message text", required: true },
  ],
  steps: [
    {
      id: "get-channel",
      description: "Look up the channel",
      operationId: "channels.info",
      inputMapping: {
        roomName: { type: "toolInput", field: "channelName" },
      },
    },
    {
      id: "get-messages",
      description: "Fetch recent messages",
      operationId: "channels.history",
      inputMapping: {
        roomId: { type: "stepOutput", stepId: "get-channel", path: ".channel._id" },
        count: { type: "literal", value: 10 },
      },
      dependsOn: ["get-channel"],
    },
    {
      id: "send-reply",
      description: "Post the reply",
      operationId: "chat.postMessage",
      inputMapping: {
        roomId: { type: "stepOutput", stepId: "get-channel", path: ".channel._id" },
        text: { type: "toolInput", field: "replyText" },
      },
      dependsOn: ["get-messages"],
    },
  ],
  decisionPoints: [],
  errorHandlers: [
    { forStep: "get-channel", strategy: "fail" },
    { forStep: "get-messages", strategy: "fail" },
    { forStep: "send-reply", strategy: "retry", maxRetries: 2 },
  ],
  rollbackHooks: [],
  requiredOperations: ["channels.info", "channels.history", "chat.postMessage"],
  needsEventBridge: false,
};
