import type { WorkflowTemplate } from "@/types";

const CUSTOM_CODE = `import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RocketChatClient } from "../client.js";

export function registerMentionAutoReply(
  server: McpServer,
  client: RocketChatClient,
): void {
  server.tool(
    "rc_mention_auto_reply",
    "Configure auto-reply for @mentions. When someone mentions a target username, sends an automatic response. Works with the RC App event bridge for real-time detection.",
    {
      targetUsername: z.string().describe("Username to watch for mentions (e.g., 'support')"),
      replyTemplate: z.string().describe("Reply message template. Use {sender} for who mentioned, {channel} for where"),
      channelFilter: z.string().describe("Only auto-reply in this channel (optional, empty = all channels)").optional(),
    },
    async ({ targetUsername, replyTemplate, channelFilter }) => {
      const me = await client.get("/api/v1/me").catch(() => null);
      if (!me?.username) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({
            success: false, error: "Could not verify bot identity", failedStep: "auth-check",
          }) }],
        };
      }

      let targetRoom: { _id: string; t: string } | null = null;
      if (channelFilter) {
        try {
          targetRoom = await client.resolveRoom(channelFilter);
        } catch {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              success: false,
              error: \`Channel '\${channelFilter}' not found\`,
              failedStep: "resolve-channel",
            }) }],
          };
        }
      }

      const rooms = await client.get("/api/v1/rooms.get").catch(() => null);
      const activeRooms = rooms?.update ?? [];

      const matchingRooms = channelFilter && targetRoom
        ? [targetRoom]
        : activeRooms.filter((r: any) => r.t === "c" || r.t === "p");

      const recent = await client.get("/api/v1/channels.history", {
        roomId: matchingRooms[0]?._id,
        count: 50,
      }).catch(() => ({ messages: [] }));

      const mentions = (recent.messages ?? []).filter((m: any) =>
        m.msg?.includes(\`@\${targetUsername}\`) && m.u?.username !== me.username
      );

      const replies: Array<{ messageId: string; channel: string; sender: string }> = [];
      for (const mention of mentions.slice(0, 5)) {
        try {
          const replyText = replyTemplate
            .replace("{sender}", mention.u?.username ?? "someone")
            .replace("{channel}", mention.rid ?? "unknown");

          const posted = await client.post("/api/v1/chat.postMessage", {
            roomId: mention.rid,
            text: replyText,
          });
          replies.push({
            messageId: posted.message._id,
            channel: mention.rid,
            sender: mention.u?.username,
          });
        } catch {}
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          success: true,
          botUsername: me.username,
          targetUsername,
          channelFilter: channelFilter ?? "all channels",
          mentionsFound: mentions.length,
          repliesSent: replies.length,
          replies,
          hint: "For real-time detection, deploy the generated RC App event bridge. It will POST to your MCP server whenever a mention is detected.",
        }) }],
      };
    },
  );
}
`;

export const mentionAutoReply: WorkflowTemplate = {
  id: "mention-auto-reply",
  name: "Mention Auto-Reply",
  intent: "Auto-reply when someone mentions a specific username like @support. Uses RC App event bridge for real-time detection.",
  keywords: [
    "mention", "auto-reply", "auto reply", "support", "bot reply",
    "watch mentions", "respond to mentions", "real-time",
  ],
  toolName: "rc_mention_auto_reply",
  toolDescription: "Configure auto-reply for @mentions. When someone mentions a target username, sends an automatic response. Works with the RC App event bridge for real-time detection.",
  inputs: [
    { name: "targetUsername", type: "string", description: "Username to watch for mentions (e.g., 'support')", required: true },
    { name: "replyTemplate", type: "string", description: "Reply message template. Use {sender} for who mentioned, {channel} for where", required: true },
    { name: "channelFilter", type: "string", description: "Only auto-reply in this channel (optional)", required: false },
  ],
  steps: [
    { id: "auth-check", description: "Verify bot identity", operationId: "me", inputMapping: {} },
    { id: "resolve-channel", description: "Find target channel if filtered", operationId: "channels.info", inputMapping: {} },
    { id: "scan-mentions", description: "Scan recent messages for mentions", operationId: "channels.history", inputMapping: {} },
    { id: "send-replies", description: "Send auto-replies to mentioners", operationId: "chat.postMessage", inputMapping: {} },
  ],
  decisionPoints: [
    { afterStep: "auth-check", condition: "channelFilter provided", ifTrue: ["resolve-channel"], ifFalse: [] },
  ],
  errorHandlers: [
    { forStep: "auth-check", strategy: "fail" },
    { forStep: "resolve-channel", strategy: "fail" },
    { forStep: "scan-mentions", strategy: "skip" },
    { forStep: "send-replies", strategy: "skip" },
  ],
  rollbackHooks: [],
  requiredOperations: ["me", "rooms.get", "channels.info", "channels.history", "chat.postMessage"],
  needsEventBridge: true,
  eventSubscriptions: [
    { event: "message", filter: "contains @mention of target username", triggerStep: "scan-mentions" },
  ],
  customEmitter: () => CUSTOM_CODE,
};
