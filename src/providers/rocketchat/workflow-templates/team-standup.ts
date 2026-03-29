import type { WorkflowTemplate } from "@/types";

export const teamStandup: WorkflowTemplate = {
  id: "team-standup",
  name: "Team Standup Automation",
  intent: "Automate daily standups by collecting status from team members, posting a summary to the team channel, and DM-ing members who haven't reported",
  keywords: [
    "standup", "daily", "status", "scrum", "meeting", "report",
    "team update", "check-in", "morning",
  ],
  toolName: "rc_run_standup",
  toolDescription: "Run a team standup: collects recent messages from team members, compiles a summary, posts it to the team channel, and reminds members who haven't posted.",
  inputs: [
    { name: "teamChannelName", type: "string", description: "Channel name for the team standup", required: true },
    { name: "lookbackHours", type: "number", description: "Hours to look back for standup messages (default 24)", required: false, default: 24 },
    { name: "reminderText", type: "string", description: "Reminder message for silent members", required: false },
  ],
  steps: [
    {
      id: "get-channel",
      description: "Look up the standup channel",
      operationId: "channels.info",
      inputMapping: {
        roomName: { type: "toolInput", field: "teamChannelName" },
      },
    },
    {
      id: "get-members",
      description: "List all members of the standup channel",
      operationId: "channels.members",
      inputMapping: {
        roomId: { type: "stepOutput", stepId: "get-channel", path: ".channel._id" },
      },
      dependsOn: ["get-channel"],
    },
    {
      id: "get-history",
      description: "Fetch recent messages to find who has reported",
      operationId: "channels.history",
      inputMapping: {
        roomId: { type: "stepOutput", stepId: "get-channel", path: ".channel._id" },
        count: { type: "literal", value: 100 },
      },
      dependsOn: ["get-channel"],
    },
    {
      id: "post-summary",
      description: "Post the compiled standup summary",
      operationId: "chat.postMessage",
      inputMapping: {
        roomId: { type: "stepOutput", stepId: "get-channel", path: ".channel._id" },
        text: { type: "expression", expr: "summaryText" },
      },
      dependsOn: ["get-members", "get-history"],
    },
    {
      id: "remind-silent-members",
      description: "DM members who haven't posted their standup",
      operationId: "chat.postMessage",
      inputMapping: {
        channel: { type: "expression", expr: "`@${memberUsername}`" },
        text: { type: "expression", expr: "reminderText || 'Reminder: Please post your standup update!'" },
      },
      dependsOn: ["post-summary"],
    },
  ],
  decisionPoints: [],
  errorHandlers: [
    { forStep: "get-channel", strategy: "fail" },
    { forStep: "get-members", strategy: "fail" },
    { forStep: "get-history", strategy: "fail" },
    { forStep: "post-summary", strategy: "retry", maxRetries: 2 },
    { forStep: "remind-silent-members", strategy: "skip" },
  ],
  rollbackHooks: [],
  requiredOperations: [
    "channels.info",
    "channels.members",
    "channels.history",
    "chat.postMessage",
  ],
  needsEventBridge: false,
};
