import { describe, it, expect } from "vitest";
import { runWorkflow, getProvider } from "./runner";

const provider = getProvider();

describe("Workflow: onboard-team-member", () => {
  const r = runWorkflow("onboard-team-member");

  it("generates tool file", () => {
    expect(r.toolFileContent.length).toBeGreaterThan(100);
  });

  it("has decision logic for user existence check", () => {
    expect(r.hasDecisionLogic).toBe(true);
    expect(r.toolFileContent).toContain("checkUserExists");
  });

  it("has error handling for non-critical steps", () => {
    expect(r.hasErrorHandling).toBe(true);
  });

  it("calls users.info and users.create", () => {
    expect(r.toolFileContent).toContain("/api/v1/users.info");
    expect(r.toolFileContent).toContain("/api/v1/users.create");
  });

  it("calls channels.invite and chat.postMessage", () => {
    expect(r.toolFileContent).toContain("/api/v1/channels.invite");
    expect(r.toolFileContent).toContain("/api/v1/chat.postMessage");
  });

  it("does not need event bridge", () => {
    expect(r.hasEventBridge).toBe(false);
  });
});

describe("Workflow: customer-support-bot", () => {
  const r = runWorkflow("customer-support-bot");

  it("generates tool file", () => {
    expect(r.toolFileContent.length).toBeGreaterThan(100);
  });

  it("has decision logic for escalation vs close", () => {
    expect(r.hasDecisionLogic).toBe(true);
    expect(r.toolFileContent).toContain("general");
  });

  it("has retry error handling", () => {
    expect(r.toolFileContent).toContain("attempt");
  });

  it("calls livechat endpoints", () => {
    expect(r.toolFileContent).toContain("/api/v1/livechat");
  });

  it("generates event bridge", () => {
    expect(r.hasEventBridge).toBe(true);
  });
});

describe("Workflow: cicd-notifier", () => {
  const r = runWorkflow("cicd-notifier");

  it("generates tool file", () => {
    expect(r.toolFileContent.length).toBeGreaterThan(100);
  });

  it("has decision logic for channel existence", () => {
    expect(r.hasDecisionLogic).toBe(true);
    expect(r.toolFileContent).toContain("resolveChannel");
  });

  it("has decision logic for failure pinning", () => {
    expect(r.toolFileContent).toContain("failure");
  });

  it("calls channels.info and channels.create", () => {
    expect(r.toolFileContent).toContain("/api/v1/channels.info");
    expect(r.toolFileContent).toContain("/api/v1/channels.create");
  });

  it("calls chat.pinMessage", () => {
    expect(r.toolFileContent).toContain("/api/v1/chat.pinMessage");
  });
});

describe("Workflow: team-standup", () => {
  const r = runWorkflow("team-standup");

  it("generates tool file", () => {
    expect(r.toolFileContent.length).toBeGreaterThan(100);
  });

  it("calls channels.members and channels.history", () => {
    expect(r.toolFileContent).toContain("/api/v1/channels.members");
    expect(r.toolFileContent).toContain("/api/v1/channels.history");
  });

  it("has retry for posting summary", () => {
    expect(r.toolFileContent).toContain("attempt");
  });

  it("has skip handling for reminders", () => {
    expect(r.hasErrorHandling).toBe(true);
  });
});

describe("Workflow: content-moderation", () => {
  const r = runWorkflow("content-moderation");

  it("generates tool file", () => {
    expect(r.toolFileContent.length).toBeGreaterThan(100);
  });

  it("has decision logic for severity branching", () => {
    expect(r.hasDecisionLogic).toBe(true);
    expect(r.toolFileContent).toContain("severity");
  });

  it("calls moderation endpoints", () => {
    expect(r.toolFileContent).toContain("/api/v1/moderation.reportsByUsers");
  });

  it("calls users.setActiveStatus for deactivation", () => {
    expect(r.toolFileContent).toContain("/api/v1/users.setActiveStatus");
  });

  it("generates event bridge", () => {
    expect(r.hasEventBridge).toBe(true);
  });
});

describe("Workflow: channel-management", () => {
  const r = runWorkflow("channel-management");

  it("generates tool file", () => {
    expect(r.toolFileContent.length).toBeGreaterThan(100);
  });

  it("has decision logic for create vs update", () => {
    expect(r.hasDecisionLogic).toBe(true);
    expect(r.toolFileContent).toContain("findChannel");
  });

  it("calls channels.create and channels.setTopic", () => {
    expect(r.toolFileContent).toContain("/api/v1/channels.create");
    expect(r.toolFileContent).toContain("/api/v1/channels.setTopic");
  });
});

describe("Workflow: message-search", () => {
  const r = runWorkflow("message-search");

  it("generates tool file", () => {
    expect(r.toolFileContent.length).toBeGreaterThan(100);
  });

  it("calls chat.search", () => {
    expect(r.toolFileContent).toContain("/api/v1/chat.search");
  });

  it("calls chat.pinMessage and chat.react", () => {
    expect(r.toolFileContent).toContain("/api/v1/chat.pinMessage");
    expect(r.toolFileContent).toContain("/api/v1/chat.react");
  });

  it("has skip handling for pin/react failures", () => {
    expect(r.hasErrorHandling).toBe(true);
  });
});

describe("Workflow: file-sharing", () => {
  const r = runWorkflow("file-sharing");

  it("generates tool file", () => {
    expect(r.toolFileContent.length).toBeGreaterThan(100);
  });

  it("calls rooms.upload", () => {
    expect(r.toolFileContent).toContain("/api/v1/rooms.upload");
  });

  it("calls rooms.info for verification", () => {
    expect(r.toolFileContent).toContain("/api/v1/rooms.info");
  });
});

describe("Workflow: analytics-reporter", () => {
  const r = runWorkflow("analytics-reporter");

  it("generates tool file", () => {
    expect(r.toolFileContent.length).toBeGreaterThan(100);
  });

  it("has decision logic for includeUserStats", () => {
    expect(r.hasDecisionLogic).toBe(true);
    expect(r.toolFileContent).toContain("includeUserStats");
  });

  it("calls statistics endpoint", () => {
    expect(r.toolFileContent).toContain("/api/v1/statistics");
  });

  it("calls channels.list for activity data", () => {
    expect(r.toolFileContent).toContain("/api/v1/channels.list");
  });
});

describe("Workflow: webhook-integration", () => {
  const r = runWorkflow("webhook-integration");

  it("generates tool file", () => {
    expect(r.toolFileContent.length).toBeGreaterThan(100);
  });

  it("calls integrations.create", () => {
    expect(r.toolFileContent).toContain("/api/v1/integrations.create");
  });

  it("calls integrations.list for dedup check", () => {
    expect(r.toolFileContent).toContain("/api/v1/integrations.list");
  });

  it("calls channels.info for verification", () => {
    expect(r.toolFileContent).toContain("/api/v1/channels.info");
  });
});

describe("Workflow: notification-bot", () => {
  const r = runWorkflow("notification-bot");

  it("generates tool file", () => {
    expect(r.toolFileContent.length).toBeGreaterThan(100);
  });

  it("has decision logic for urgent pinning", () => {
    expect(r.hasDecisionLogic).toBe(true);
    expect(r.toolFileContent).toContain("urgent");
  });

  it("calls chat.postMessage", () => {
    expect(r.toolFileContent).toContain("/api/v1/chat.postMessage");
  });

  it("calls chat.pinMessage for urgent", () => {
    expect(r.toolFileContent).toContain("/api/v1/chat.pinMessage");
  });
});

describe("Workflow: minimal-chatbot", () => {
  const r = runWorkflow("minimal-chatbot");

  it("generates tool file", () => {
    expect(r.toolFileContent.length).toBeGreaterThan(100);
  });

  it("has no workflow-level decision points (baseline)", () => {
    const workflow = provider.workflowTemplates.find((w) => w.id === "minimal-chatbot")!;
    expect(workflow.decisionPoints.length).toBe(0);
  });

  it("calls channels.info, channels.history, chat.postMessage", () => {
    expect(r.toolFileContent).toContain("/api/v1/channels.info");
    expect(r.toolFileContent).toContain("/api/v1/channels.history");
    expect(r.toolFileContent).toContain("/api/v1/chat.postMessage");
  });

  it("has lowest token count", () => {
    expect(r.tokenReport.selectedTokens).toBeLessThan(120);
  });
});

describe("All Workflows Summary", () => {
  const allIds = provider.workflowTemplates.map((w) => w.id);

  it("all 12 workflows generate successfully", () => {
    for (const id of allIds) {
      const r = runWorkflow(id);
      expect(r.files.length).toBeGreaterThan(0);
      expect(r.toolFileContent.length).toBeGreaterThan(100);
    }
  });

  it("all token reports show savings > 80%", () => {
    for (const id of allIds) {
      const r = runWorkflow(id);
      expect(parseFloat(r.tokenReport.savingsPercent)).toBeGreaterThan(80);
    }
  });

  it("exactly 2 workflows need event bridge", () => {
    const withBridge = allIds.filter((id) => runWorkflow(id).hasEventBridge);
    expect(withBridge).toEqual(["customer-support-bot", "content-moderation"]);
  });
});
