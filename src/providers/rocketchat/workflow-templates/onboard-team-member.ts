import type { WorkflowTemplate } from "@/types";

const CUSTOM_CODE = `import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RocketChatClient } from "../client.js";

const ROLE_CHANNELS: Record<string, string[]> = {
  developer: ["general", "engineering", "deployments", "code-reviews"],
  support: ["general", "support", "escalations", "customer-feedback"],
  design: ["general", "design", "feedback", "assets"],
  default: ["general"],
};

export function registerOnboardTeamMember(
  server: McpServer,
  client: RocketChatClient,
): void {
  server.tool(
    "rc_onboard_team_member",
    "Onboard a new team member: creates account if needed, adds to role-appropriate channels (public or private), sends welcome DM. Rolls back user creation if all channel invites fail.",
    {
      username: z.string().describe("Username for the new member"),
      email: z.string().describe("Email address"),
      displayName: z.string().describe("Display name"),
      role: z.string().describe("Team role: developer, support, design, or default"),
      welcomeMessage: z.string().describe("Custom welcome message (optional)").optional(),
    },
    async ({ username, email, displayName, role, welcomeMessage }) => {
      let userId: string;
      let userCreated = false;

      const existing = await client.get("/api/v1/users.info", {
        username,
      }).catch(() => null);

      if (existing?.user) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({
            success: false,
            error: "User already exists",
            userId: existing.user._id,
            username: existing.user.username,
            hint: "User is already onboarded. No action taken.",
          }) }],
        };
      }

      try {
        const created = await client.post("/api/v1/users.create", {
          username,
          email,
          name: displayName,
          password: crypto.randomUUID().slice(0, 16),
          roles: ["user"],
        });
        userId = created.user._id;
        userCreated = true;
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({
            success: false, error: err.message, failedStep: "create-user",
          }) }],
        };
      }

      const targetChannels = ROLE_CHANNELS[role] ?? ROLE_CHANNELS["default"];
      const channelResults: Array<{ channel: string; status: string; type?: string }> = [];

      for (const channelName of targetChannels) {
        try {
          const room = await client.resolveRoom(channelName);
          const inviteEndpoint = room.t === "p"
            ? "/api/v1/groups.invite"
            : "/api/v1/channels.invite";

          await client.post(inviteEndpoint, {
            roomId: room._id,
            userId,
          });
          channelResults.push({
            channel: channelName,
            status: "joined",
            type: room.t === "p" ? "private" : "public",
          });
        } catch {
          channelResults.push({ channel: channelName, status: "skipped" });
        }
      }

      const joinedCount = channelResults.filter(c => c.status === "joined").length;

      if (joinedCount === 0 && userCreated) {
        try {
          await client.post("/api/v1/users.delete", { userId });
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              success: false,
              error: "All channel invites failed — rolled back user creation",
              failedStep: "invite-to-channels",
              channelResults,
              rolledBack: true,
            }) }],
          };
        } catch {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              success: false,
              error: "All channel invites failed and rollback also failed — user exists but has no channels",
              userId,
              username,
              channelResults,
              rolledBack: false,
            }) }],
          };
        }
      }

      let dmSent = false;
      try {
        const joined = channelResults.filter(c => c.status === "joined").map(c => c.channel).join(", ");
        const text = welcomeMessage
          ?? \`Welcome to the team, \${displayName}! You've been added to: \${joined}\`;
        await client.post("/api/v1/chat.postMessage", {
          channel: \`@\${username}\`,
          text,
        });
        dmSent = true;
      } catch {
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          success: true,
          userId,
          username,
          channelsJoined: joinedCount,
          channelResults,
          welcomeDmSent: dmSent,
        }) }],
      };
    },
  );
}
`;

export const onboardTeamMember: WorkflowTemplate = {
  id: "onboard-team-member",
  name: "Onboard Team Member",
  intent: "Onboard a new team member by creating their account, adding them to the right channels based on their role, and sending a welcome message",
  keywords: [
    "onboard", "onboarding", "new member", "add user", "invite",
    "team member", "welcome", "setup user", "provision",
  ],
  toolName: "rc_onboard_team_member",
  toolDescription: "Onboard a new team member: creates account if needed, adds to role-appropriate channels (public or private), sends welcome DM. Rolls back user creation if all channel invites fail.",
  inputs: [
    { name: "username", type: "string", description: "Username for the new member", required: true },
    { name: "email", type: "string", description: "Email address", required: true },
    { name: "displayName", type: "string", description: "Display name", required: true },
    { name: "role", type: "string", description: "Team role: developer, support, design, or default", required: true, enum: ["developer", "support", "design", "default"] },
    { name: "welcomeMessage", type: "string", description: "Custom welcome message (optional)", required: false },
  ],
  steps: [
    { id: "check-user-exists", description: "Check if user exists", operationId: "users.info", inputMapping: { username: { type: "toolInput", field: "username" } } },
    { id: "create-user", description: "Create user if needed", operationId: "users.create", inputMapping: {}, dependsOn: ["check-user-exists"] },
    { id: "invite-to-channels", description: "Invite to role-based channels", operationId: "channels.invite", inputMapping: {}, dependsOn: ["create-user"] },
    { id: "send-welcome-dm", description: "Send welcome DM", operationId: "chat.postMessage", inputMapping: {}, dependsOn: ["invite-to-channels"] },
  ],
  decisionPoints: [
    { afterStep: "check-user-exists", condition: "existing?.user == null", ifTrue: ["create-user"], ifFalse: [] },
  ],
  errorHandlers: [
    { forStep: "check-user-exists", strategy: "skip" },
    { forStep: "create-user", strategy: "fail" },
    { forStep: "invite-to-channels", strategy: "skip" },
    { forStep: "send-welcome-dm", strategy: "skip" },
  ],
  rollbackHooks: [],
  requiredOperations: ["users.info", "users.create", "channels.info", "groups.info", "channels.invite", "groups.invite", "users.delete", "chat.postMessage"],
  needsEventBridge: false,
  customEmitter: () => CUSTOM_CODE,
};
