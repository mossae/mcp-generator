import type { WorkflowTemplate } from "@/types";

export const messageSearch: WorkflowTemplate = {
  id: "message-search",
  name: "Message Search & Pin",
  intent: "Search for messages across channels, pin important results, and react to mark them as reviewed",
  keywords: [
    "search", "find message", "pin", "react", "review",
    "lookup", "query messages",
  ],
  toolName: "rc_search_and_pin",
  toolDescription: "Search messages in a channel, optionally pin matches and add a reaction to mark them reviewed.",
  inputs: [
    { name: "roomId", type: "string", description: "Room to search in", required: true },
    { name: "searchText", type: "string", description: "Text to search for", required: true },
    { name: "pinMatches", type: "boolean", description: "Pin matching messages", required: false },
    { name: "reactEmoji", type: "string", description: "Emoji to react with (e.g., :white_check_mark:)", required: false },
  ],
  steps: [
    {
      id: "search-messages",
      description: "Search for messages matching the query",
      operationId: "chat.search",
      inputMapping: {
        roomId: { type: "toolInput", field: "roomId" },
        searchText: { type: "toolInput", field: "searchText" },
      },
    },
    {
      id: "pin-messages",
      description: "Pin each matching message",
      operationId: "chat.pinMessage",
      inputMapping: {
        messageId: { type: "expression", expr: "messageId" },
      },
      dependsOn: ["search-messages"],
    },
    {
      id: "react-messages",
      description: "Add review emoji to each matching message",
      operationId: "chat.react",
      inputMapping: {
        emoji: { type: "toolInput", field: "reactEmoji" },
        messageId: { type: "expression", expr: "messageId" },
      },
      dependsOn: ["search-messages"],
    },
  ],
  decisionPoints: [],
  errorHandlers: [
    { forStep: "search-messages", strategy: "fail" },
    { forStep: "pin-messages", strategy: "skip" },
    { forStep: "react-messages", strategy: "skip" },
  ],
  rollbackHooks: [],
  requiredOperations: ["chat.search", "chat.pinMessage", "chat.react"],
  needsEventBridge: false,
};
