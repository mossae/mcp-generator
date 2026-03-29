import type { WorkflowTemplate } from "../../../types/index.js";

export const customerSupportBot: WorkflowTemplate = {
  id: "customer-support-bot",
  name: "Customer Support Bot",
  intent: "Handle customer support by checking open livechat rooms, getting visitor info, sending responses, and escalating or closing conversations based on issue complexity",
  keywords: [
    "support", "customer", "livechat", "omnichannel", "help desk",
    "ticket", "agent", "escalate", "resolve",
  ],
  toolName: "rc_handle_support_ticket",
  toolDescription: "Handle a customer support ticket: checks visitor history, sends a response, and decides whether to escalate or close based on the issue type.",
  inputs: [
    { name: "roomId", type: "string", description: "The livechat room ID", required: true },
    { name: "responseText", type: "string", description: "Response to send to the visitor", required: true },
    { name: "issueType", type: "string", description: "Issue category: billing, technical, general", required: true, enum: ["billing", "technical", "general"] },
    { name: "escalateToUserId", type: "string", description: "User ID to escalate to (optional)", required: false },
  ],
  steps: [
    {
      id: "get-room-info",
      description: "Get the livechat room details",
      operationId: "livechat/rooms",
      inputMapping: {},
    },
    {
      id: "get-visitor-info",
      description: "Fetch visitor information for context",
      operationId: "livechat/visitors.info",
      inputMapping: {
        visitorId: { type: "expression", expr: "visitorId" },
      },
      dependsOn: ["get-room-info"],
    },
    {
      id: "send-response",
      description: "Send the support response to the visitor",
      operationId: "livechat/message",
      inputMapping: {
        rid: { type: "toolInput", field: "roomId" },
        msg: { type: "toolInput", field: "responseText" },
      },
      dependsOn: ["get-visitor-info"],
    },
    {
      id: "escalate-ticket",
      description: "Transfer the room to a specialist agent (for technical/billing issues)",
      operationId: "livechat/room.transfer",
      inputMapping: {
        rid: { type: "toolInput", field: "roomId" },
        userId: { type: "toolInput", field: "escalateToUserId" },
      },
      dependsOn: ["send-response"],
    },
    {
      id: "close-ticket",
      description: "Close the livechat room (for resolved general issues)",
      operationId: "livechat/room.close",
      inputMapping: {
        rid: { type: "toolInput", field: "roomId" },
      },
      dependsOn: ["send-response"],
    },
  ],
  decisionPoints: [
    {
      afterStep: "send-response",
      condition: 'issueType === "general"',
      ifTrue: ["close-ticket"],
      ifFalse: ["escalate-ticket"],
    },
  ],
  errorHandlers: [
    { forStep: "get-room-info", strategy: "fail" },
    { forStep: "get-visitor-info", strategy: "skip" },
    { forStep: "send-response", strategy: "retry", maxRetries: 2 },
    { forStep: "escalate-ticket", strategy: "retry", maxRetries: 2 },
    { forStep: "close-ticket", strategy: "skip" },
  ],
  rollbackHooks: [],
  requiredOperations: [
    "livechat/rooms",
    "livechat/visitors.info",
    "livechat/message",
    "livechat/room.transfer",
    "livechat/room.close",
  ],
  needsEventBridge: true,
  eventSubscriptions: [
    { event: "message", filter: "livechat room", triggerStep: "get-room-info" },
  ],
};
