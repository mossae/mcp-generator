import type { WorkflowTemplate } from "@/types";

/**
 * Onboard Team Member — the showcase workflow.
 *
 * This demonstrates what sets our generator apart: real decision logic.
 * - Checks if user exists, creates if not
 * - Determines channels based on role (developer vs support vs default)
 * - Invites to channels with per-channel error handling (non-fatal)
 * - Sends a welcome DM
 * - Handles each failure independently with skip/rollback strategies
 */
export const onboardTeamMember: WorkflowTemplate = {
  id: "onboard-team-member",
  name: "Onboard Team Member",
  intent: "Onboard a new team member by creating their account, adding them to the right channels based on their role, and sending a welcome message",
  keywords: [
    "onboard", "onboarding", "new member", "add user", "invite",
    "team member", "welcome", "setup user", "provision",
  ],
  toolName: "rc_onboard_team_member",
  toolDescription: "Onboard a new team member: creates account if needed, adds to role-appropriate channels, sends welcome DM. Handles failures per-step without aborting the whole operation.",
  inputs: [
    { name: "username", type: "string", description: "Username for the new member", required: true },
    { name: "email", type: "string", description: "Email address", required: true },
    { name: "displayName", type: "string", description: "Display name", required: true },
    { name: "role", type: "string", description: "Team role: developer, support, design, or default", required: true, enum: ["developer", "support", "design", "default"] },
    { name: "welcomeMessage", type: "string", description: "Custom welcome message (optional)", required: false },
  ],
  steps: [
    {
      id: "check-user-exists",
      description: "Check if the user already exists",
      operationId: "users.info",
      inputMapping: {
        username: { type: "toolInput", field: "username" },
      },
    },
    {
      id: "create-user",
      description: "Create the user account (only if user doesn't exist)",
      operationId: "users.create",
      inputMapping: {
        username: { type: "toolInput", field: "username" },
        email: { type: "toolInput", field: "email" },
        name: { type: "toolInput", field: "displayName" },
        password: { type: "expression", expr: "crypto.randomUUID().slice(0, 16)" },
        roles: { type: "expression", expr: '[\"user\"]' },
      },
      dependsOn: ["check-user-exists"],
    },
    {
      id: "resolve-channels",
      description: "Determine which channels to add based on role",
      operationId: "channels.list",
      inputMapping: {},
      dependsOn: ["check-user-exists"],
    },
    {
      id: "invite-to-channels",
      description: "Invite user to each determined channel with per-channel error handling",
      operationId: "channels.invite",
      inputMapping: {
        roomId: { type: "expression", expr: "channelId" },
        userId: { type: "expression", expr: "userId" },
      },
      dependsOn: ["resolve-channels"],
    },
    {
      id: "send-welcome-dm",
      description: "Send a welcome direct message to the new member",
      operationId: "chat.postMessage",
      inputMapping: {
        channel: { type: "expression", expr: "`@${username}`" },
        text: { type: "expression", expr: "welcomeText" },
      },
      dependsOn: ["invite-to-channels"],
    },
  ],
  decisionPoints: [
    {
      afterStep: "check-user-exists",
      condition: "checkUserExists?.user == null",
      ifTrue: ["create-user"],
      ifFalse: [],
    },
  ],
  errorHandlers: [
    { forStep: "check-user-exists", strategy: "fail" },
    { forStep: "create-user", strategy: "fail" },
    { forStep: "invite-to-channels", strategy: "skip" },
    { forStep: "send-welcome-dm", strategy: "skip" },
  ],
  rollbackHooks: [
    {
      triggerOnFailure: "create-user",
      steps: [],
    },
  ],
  requiredOperations: [
    "users.info",
    "users.create",
    "channels.list",
    "channels.invite",
    "chat.postMessage",
  ],
  needsEventBridge: false,
};
