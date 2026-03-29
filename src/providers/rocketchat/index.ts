import type { ProviderSpec, ApiEndpoint, ApiCategory } from "../../types/index.js";
import type { WorkflowTemplate } from "../../types/index.js";
import { onboardTeamMember } from "./workflow-templates/onboard-team-member.js";
import { customerSupportBot } from "./workflow-templates/customer-support-bot.js";
import { cicdNotifier } from "./workflow-templates/cicd-notifier.js";
import { teamStandup } from "./workflow-templates/team-standup.js";
import { contentModeration } from "./workflow-templates/content-moderation.js";
import { channelManagement } from "./workflow-templates/channel-management.js";
import { messageSearch } from "./workflow-templates/message-search.js";
import { fileSharing } from "./workflow-templates/file-sharing.js";
import { analyticsReporter } from "./workflow-templates/analytics-reporter.js";
import { webhookIntegration } from "./workflow-templates/webhook-integration.js";
import { notificationBot } from "./workflow-templates/notification-bot.js";
import { minimalChatbot } from "./workflow-templates/minimal-chatbot.js";
import { RC_CATEGORIES, RC_ENDPOINTS } from "./api-catalog.js";

export function createRocketChatProvider(): ProviderSpec {
  return {
    name: "rocketchat",
    displayName: "Rocket.Chat",
    baseUrl: "http://localhost:3000",
    authScheme: {
      type: "token",
      headerName: "X-Auth-Token",
      userIdHeader: "X-User-Id",
    },
    eventSystem: {
      transport: "websocket",
      connectionUrl: "/websocket",
      eventTypes: [
        "message",
        "user-joined",
        "user-left",
        "mention",
        "reaction",
        "room-changed",
      ],
    },
    categories: RC_CATEGORIES,
    endpoints: RC_ENDPOINTS,
    workflowTemplates: [
      onboardTeamMember,
      customerSupportBot,
      cicdNotifier,
      teamStandup,
      contentModeration,
      channelManagement,
      messageSearch,
      fileSharing,
      analyticsReporter,
      webhookIntegration,
      notificationBot,
      minimalChatbot,
    ],
  };
}
