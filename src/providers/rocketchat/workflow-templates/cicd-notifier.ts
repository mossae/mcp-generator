import type { WorkflowTemplate } from "@/types";

const CUSTOM_CODE = `import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RocketChatClient } from "../client.js";

const STATUS_EMOJI: Record<string, string> = {
  success: "\\u2705",
  failure: "\\u274C",
  warning: "\\u26A0\\uFE0F",
};

export function registerCicdNotifier(
  server: McpServer,
  client: RocketChatClient,
): void {
  server.tool(
    "rc_cicd_notify",
    "Post CI/CD notifications: routes to the right channel (public or private), creates it if missing, pins failures, DMs the commit author.",
    {
      projectName: z.string().describe("Project/repo name"),
      status: z.string().describe("Build status: success, failure, warning"),
      message: z.string().describe("Notification message with build details"),
      commitAuthor: z.string().describe("Username of the commit author").optional(),
    },
    async ({ projectName, status, message, commitAuthor }) => {
      const channelName = \`\${projectName}-builds\`;
      let channelId: string;
      let channelType: string = "c";
      let channelCreated = false;

      try {
        const room = await client.resolveRoom(channelName);
        channelId = room._id;
        channelType = room.t;
      } catch {
        try {
          const created = await client.post("/api/v1/channels.create", {
            name: channelName,
            members: [],
          });
          channelId = created.channel._id;
          channelCreated = true;
        } catch (err: any) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              success: false, error: err.message, failedStep: "create-channel",
            }) }],
          };
        }
      }

      const emoji = STATUS_EMOJI[status] ?? "";
      const formatted = \`\${emoji} [\${status.toUpperCase()}] \${projectName}\\n\${message}\`;

      let messageId: string | null = null;
      try {
        const posted = await client.post("/api/v1/chat.postMessage", {
          roomId: channelId,
          text: formatted,
        });
        messageId = posted.message._id;
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({
            success: false, error: err.message, failedStep: "post-notification",
          }) }],
        };
      }

      let pinned = false;
      let authorNotified = false;

      if (status === "failure") {
        try {
          await client.post("/api/v1/chat.pinMessage", { messageId });
          pinned = true;
        } catch {}

        if (commitAuthor) {
          try {
            await client.post("/api/v1/chat.postMessage", {
              channel: \`@\${commitAuthor}\`,
              text: \`\${emoji} Build failed for \${projectName}: \${message}\`,
            });
            authorNotified = true;
          } catch {}
        }
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          success: true,
          channel: channelName,
          channelType: channelType === "p" ? "private" : "public",
          channelCreated,
          messageId,
          status,
          pinned,
          authorNotified,
        }) }],
      };
    },
  );
}
`;

export const cicdNotifier: WorkflowTemplate = {
  id: "cicd-notifier",
  name: "CI/CD Notifier",
  intent: "Post CI/CD build and deployment notifications to the right channels based on status and severity, creating channels if they don't exist",
  keywords: [
    "cicd", "ci/cd", "build", "deploy", "deployment", "pipeline",
    "notification", "jenkins", "github actions", "notify",
  ],
  toolName: "rc_cicd_notify",
  toolDescription: "Post CI/CD notifications: routes to the right channel (public or private), creates it if missing, pins failures, DMs the commit author.",
  inputs: [
    { name: "projectName", type: "string", description: "Project/repo name", required: true },
    { name: "status", type: "string", description: "Build status: success, failure, warning", required: true, enum: ["success", "failure", "warning"] },
    { name: "message", type: "string", description: "Notification message with build details", required: true },
    { name: "commitAuthor", type: "string", description: "Username of the commit author", required: false },
  ],
  steps: [
    { id: "resolve-channel", description: "Find builds channel (public or private)", operationId: "channels.info", inputMapping: {} },
    { id: "create-channel", description: "Create channel if missing", operationId: "channels.create", inputMapping: {} },
    { id: "post-notification", description: "Post notification", operationId: "chat.postMessage", inputMapping: {} },
    { id: "pin-failure", description: "Pin on failure", operationId: "chat.pinMessage", inputMapping: {}, dependsOn: ["post-notification"] },
    { id: "dm-author", description: "DM author on failure", operationId: "chat.postMessage", inputMapping: {}, dependsOn: ["post-notification"] },
  ],
  decisionPoints: [
    { afterStep: "resolve-channel", condition: "room not found", ifTrue: ["create-channel"], ifFalse: [] },
    { afterStep: "post-notification", condition: 'status === "failure"', ifTrue: ["pin-failure", "dm-author"], ifFalse: [] },
  ],
  errorHandlers: [
    { forStep: "resolve-channel", strategy: "skip" },
    { forStep: "create-channel", strategy: "fail" },
    { forStep: "post-notification", strategy: "fail" },
    { forStep: "pin-failure", strategy: "skip" },
    { forStep: "dm-author", strategy: "skip" },
  ],
  rollbackHooks: [],
  requiredOperations: ["channels.info", "groups.info", "channels.create", "chat.postMessage", "chat.pinMessage"],
  needsEventBridge: false,
  customEmitter: () => CUSTOM_CODE,
};
