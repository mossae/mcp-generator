import type { WorkflowTemplate } from "@/types";

export const channelManagement: WorkflowTemplate = {
  id: "channel-management",
  name: "Channel Management",
  intent: "Create, configure, and manage channels — set topics, archive stale ones, and bulk-invite members from a team",
  keywords: [
    "channel", "create channel", "archive", "manage channels",
    "bulk invite", "topic", "configure channel",
  ],
  toolName: "rc_manage_channel",
  toolDescription: "Create or update a channel: sets topic/description, invites a list of members, and archives if requested. Handles missing members gracefully.",
  inputs: [
    { name: "channelName", type: "string", description: "Channel name to create or update", required: true },
    { name: "topic", type: "string", description: "Channel topic", required: false },
    { name: "members", type: "string[]", description: "Usernames to invite", required: false },
    { name: "shouldArchive", type: "boolean", description: "Archive the channel instead of updating", required: false },
  ],
  steps: [
    {
      id: "find-channel",
      description: "Check if the channel already exists",
      operationId: "channels.info",
      inputMapping: { roomName: { type: "toolInput", field: "channelName" } },
    },
    {
      id: "create-channel",
      description: "Create the channel if it doesn't exist",
      operationId: "channels.create",
      inputMapping: {
        name: { type: "toolInput", field: "channelName" },
        members: { type: "toolInput", field: "members" },
      },
    },
    {
      id: "set-topic",
      description: "Set the channel topic",
      operationId: "channels.setTopic",
      inputMapping: {
        roomId: { type: "expression", expr: "channelId" },
        topic: { type: "toolInput", field: "topic" },
      },
      dependsOn: ["find-channel"],
    },
    {
      id: "invite-members",
      description: "Invite each member to the channel",
      operationId: "channels.invite",
      inputMapping: {
        roomId: { type: "expression", expr: "channelId" },
        userId: { type: "expression", expr: "memberId" },
      },
      dependsOn: ["find-channel"],
    },
    {
      id: "archive-channel",
      description: "Archive the channel",
      operationId: "channels.archive",
      inputMapping: {
        roomId: { type: "expression", expr: "channelId" },
      },
      dependsOn: ["find-channel"],
    },
  ],
  decisionPoints: [
    {
      afterStep: "find-channel",
      condition: "findChannel?.channel != null",
      ifTrue: ["set-topic", "invite-members"],
      ifFalse: ["create-channel"],
    },
  ],
  errorHandlers: [
    { forStep: "find-channel", strategy: "skip" },
    { forStep: "create-channel", strategy: "fail" },
    { forStep: "set-topic", strategy: "skip" },
    { forStep: "invite-members", strategy: "skip" },
    { forStep: "archive-channel", strategy: "fail" },
  ],
  rollbackHooks: [],
  requiredOperations: ["channels.info", "channels.create", "channels.setTopic", "channels.invite", "channels.archive"],
  needsEventBridge: false,
};
