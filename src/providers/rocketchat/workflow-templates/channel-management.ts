import type { WorkflowTemplate } from "@/types";

const CUSTOM_CODE = `import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RocketChatClient } from "../client.js";

export function registerChannelManagement(
  server: McpServer,
  client: RocketChatClient,
): void {
  server.tool(
    "rc_manage_channel",
    "Create or update a channel (public or private): sets topic, invites members, archives if requested. Detects channel type automatically.",
    {
      channelName: z.string().describe("Channel name to create or update"),
      topic: z.string().describe("Channel topic").optional(),
      members: z.array(z.string()).describe("Usernames to invite").optional(),
      isPrivate: z.boolean().describe("Create as private group instead of public channel").optional(),
      shouldArchive: z.boolean().describe("Archive the channel instead of updating").optional(),
    },
    async ({ channelName, topic, members, isPrivate, shouldArchive }) => {
      let roomId: string;
      let roomType: string;
      let created = false;

      try {
        const room = await client.resolveRoom(channelName);
        roomId = room._id;
        roomType = room.t;
      } catch {
        try {
          if (isPrivate) {
            const res = await client.post("/api/v1/groups.create", {
              name: channelName,
              members: members ?? [],
            });
            roomId = res.group._id;
            roomType = "p";
          } else {
            const res = await client.post("/api/v1/channels.create", {
              name: channelName,
              members: members ?? [],
            });
            roomId = res.channel._id;
            roomType = "c";
          }
          created = true;
        } catch (err: any) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              success: false, error: err.message, failedStep: "create-channel",
            }) }],
          };
        }
      }

      let topicSet = false;
      if (topic) {
        try {
          const endpoint = roomType === "p"
            ? "/api/v1/groups.setTopic"
            : "/api/v1/channels.setTopic";
          await client.post(endpoint, { roomId, topic });
          topicSet = true;
        } catch {}
      }

      const inviteResults: Array<{ username: string; status: string }> = [];
      if (members && !created) {
        for (const username of members) {
          try {
            const userInfo = await client.get("/api/v1/users.info", { username });
            if (!userInfo?.user) {
              inviteResults.push({ username, status: "user-not-found" });
              continue;
            }
            const endpoint = roomType === "p"
              ? "/api/v1/groups.invite"
              : "/api/v1/channels.invite";
            await client.post(endpoint, { roomId, userId: userInfo.user._id });
            inviteResults.push({ username, status: "invited" });
          } catch {
            inviteResults.push({ username, status: "failed" });
          }
        }
      }

      let archived = false;
      if (shouldArchive) {
        try {
          const endpoint = roomType === "p"
            ? "/api/v1/groups.archive"
            : "/api/v1/channels.archive";
          await client.post(endpoint, { roomId });
          archived = true;
        } catch (err: any) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              success: false, error: err.message, failedStep: "archive",
            }) }],
          };
        }
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          success: true,
          channelName,
          channelType: roomType === "p" ? "private" : "public",
          created,
          topicSet,
          inviteResults: inviteResults.length > 0 ? inviteResults : undefined,
          archived,
        }) }],
      };
    },
  );
}
`;

export const channelManagement: WorkflowTemplate = {
  id: "channel-management",
  name: "Channel Management",
  intent: "Create, configure, and manage channels — set topics, archive stale ones, and bulk-invite members from a team",
  keywords: [
    "channel", "create channel", "archive", "manage channels",
    "bulk invite", "topic", "configure channel", "private", "group",
  ],
  toolName: "rc_manage_channel",
  toolDescription: "Create or update a channel (public or private): sets topic, invites members, archives if requested. Detects channel type automatically.",
  inputs: [
    { name: "channelName", type: "string", description: "Channel name to create or update", required: true },
    { name: "topic", type: "string", description: "Channel topic", required: false },
    { name: "members", type: "string[]", description: "Usernames to invite", required: false },
    { name: "isPrivate", type: "boolean", description: "Create as private group instead of public channel", required: false },
    { name: "shouldArchive", type: "boolean", description: "Archive the channel instead of updating", required: false },
  ],
  steps: [
    { id: "find-channel", description: "Resolve channel (public or private)", operationId: "channels.info", inputMapping: {} },
    { id: "create-channel", description: "Create if missing", operationId: "channels.create", inputMapping: {} },
    { id: "set-topic", description: "Set topic", operationId: "channels.setTopic", inputMapping: {} },
    { id: "invite-members", description: "Invite members", operationId: "channels.invite", inputMapping: {} },
    { id: "archive-channel", description: "Archive if requested", operationId: "channels.archive", inputMapping: {} },
  ],
  decisionPoints: [
    { afterStep: "find-channel", condition: "room not found", ifTrue: ["create-channel"], ifFalse: [] },
    { afterStep: "invite-members", condition: "shouldArchive === true", ifTrue: ["archive-channel"], ifFalse: [] },
  ],
  errorHandlers: [
    { forStep: "find-channel", strategy: "skip" },
    { forStep: "create-channel", strategy: "fail" },
    { forStep: "set-topic", strategy: "skip" },
    { forStep: "invite-members", strategy: "skip" },
    { forStep: "archive-channel", strategy: "fail" },
  ],
  rollbackHooks: [],
  requiredOperations: ["channels.info", "groups.info", "channels.create", "groups.create", "channels.setTopic", "groups.setTopic", "channels.invite", "groups.invite", "channels.archive", "groups.archive", "users.info"],
  needsEventBridge: false,
  customEmitter: () => CUSTOM_CODE,
};
