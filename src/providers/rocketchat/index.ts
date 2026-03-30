import type { ProviderSpec } from "@/types";
import { onboardTeamMember } from "@/providers/rocketchat/workflow-templates/onboard-team-member";
import { customerSupportBot } from "@/providers/rocketchat/workflow-templates/customer-support-bot";
import { cicdNotifier } from "@/providers/rocketchat/workflow-templates/cicd-notifier";
import { teamStandup } from "@/providers/rocketchat/workflow-templates/team-standup";
import { contentModeration } from "@/providers/rocketchat/workflow-templates/content-moderation";
import { channelManagement } from "@/providers/rocketchat/workflow-templates/channel-management";
import { messageSearch } from "@/providers/rocketchat/workflow-templates/message-search";
import { fileSharing } from "@/providers/rocketchat/workflow-templates/file-sharing";
import { analyticsReporter } from "@/providers/rocketchat/workflow-templates/analytics-reporter";
import { webhookIntegration } from "@/providers/rocketchat/workflow-templates/webhook-integration";
import { notificationBot } from "@/providers/rocketchat/workflow-templates/notification-bot";
import { roomListing } from "@/providers/rocketchat/workflow-templates/room-listing";
import { mentionAutoReply } from "@/providers/rocketchat/workflow-templates/mention-auto-reply";
import { minimalChatbot } from "@/providers/rocketchat/workflow-templates/minimal-chatbot";
import { RC_CATEGORIES, RC_ENDPOINTS } from "@/providers/rocketchat/api-catalog";

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
      roomListing,
      mentionAutoReply,
      minimalChatbot,
    ],
  };
}
