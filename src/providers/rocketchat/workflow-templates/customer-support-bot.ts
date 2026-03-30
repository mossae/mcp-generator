import type { WorkflowTemplate } from "@/types";

const CUSTOM_CODE = `import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RocketChatClient } from "../client.js";

export function registerCustomerSupportBot(
  server: McpServer,
  client: RocketChatClient,
): void {
  server.tool(
    "rc_handle_support_ticket",
    "Handle a customer support ticket: checks visitor history, sends a response, and decides whether to escalate or close based on the issue type.",
    {
      roomId: z.string().describe("The livechat room ID"),
      responseText: z.string().describe("Response to send to the visitor"),
      issueType: z.string().describe("Issue category: billing, technical, general"),
      escalateToUserId: z.string().describe("User ID to escalate to (optional)").optional(),
    },
    async ({ roomId, responseText, issueType, escalateToUserId }) => {
      const visitorInfo = await client.get("/api/v1/livechat/visitors.info", {
        visitorId: roomId,
      }).catch(() => null);

      let responseSent = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await client.post("/api/v1/livechat/message", {
            rid: roomId,
            msg: responseText,
          });
          responseSent = true;
          break;
        } catch {
          if (attempt === 1) break;
        }
      }

      let action: string;
      let escalated = false;
      let closed = false;

      if (issueType === "general" && responseSent) {
        try {
          await client.post("/api/v1/livechat/room.close", { rid: roomId });
          closed = true;
          action = "closed";
        } catch {
          action = "close-failed";
        }
      } else if (escalateToUserId) {
        try {
          await client.post("/api/v1/livechat/room.transfer", {
            rid: roomId,
            userId: escalateToUserId,
          });
          escalated = true;
          action = "escalated";
        } catch {
          action = "escalation-failed";
        }
      } else {
        action = "responded-only";
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          success: responseSent,
          action,
          visitorName: visitorInfo?.visitor?.name ?? null,
          responseSent,
          escalated,
          closed,
        }) }],
      };
    },
  );
}
`;

export const customerSupportBot: WorkflowTemplate = {
  id: "customer-support-bot",
  name: "Customer Support Bot",
  intent: "Handle customer support by checking open livechat rooms, getting visitor info, sending responses, and escalating or closing conversations based on issue complexity",
  keywords: [
    "support", "customer", "livechat", "omnichannel", "help desk",
    "ticket", "agent", "escalate", "resolve",
  ],
  toolName: "rc_handle_support_ticket",
  toolDescription: "Handle a customer support ticket: checks visitor history, sends a response, and decides whether to escalate or close based on the issue type.",
  inputs: [
    { name: "roomId", type: "string", description: "The livechat room ID", required: true },
    { name: "responseText", type: "string", description: "Response to send to the visitor", required: true },
    { name: "issueType", type: "string", description: "Issue category: billing, technical, general", required: true, enum: ["billing", "technical", "general"] },
    { name: "escalateToUserId", type: "string", description: "User ID to escalate to (optional)", required: false },
  ],
  steps: [
    { id: "get-visitor", description: "Get visitor info", operationId: "livechat/visitors.info", inputMapping: {} },
    { id: "send-response", description: "Send response", operationId: "livechat/message", inputMapping: {} },
    { id: "escalate-or-close", description: "Escalate or close based on issue type", operationId: "livechat/room.transfer", inputMapping: {} },
  ],
  decisionPoints: [
    { afterStep: "send-response", condition: 'issueType === "general"', ifTrue: ["close"], ifFalse: ["escalate"] },
  ],
  errorHandlers: [
    { forStep: "get-visitor", strategy: "skip" },
    { forStep: "send-response", strategy: "retry", maxRetries: 2 },
    { forStep: "escalate-or-close", strategy: "skip" },
  ],
  rollbackHooks: [],
  requiredOperations: ["livechat/visitors.info", "livechat/message", "livechat/room.transfer", "livechat/room.close"],
  needsEventBridge: true,
  eventSubscriptions: [
    { event: "message", filter: "livechat room", triggerStep: "get-visitor" },
  ],
  customEmitter: () => CUSTOM_CODE,
};
