import { describe, it, expect } from "vitest";
import { NLParser } from "@/cli/nl-parser";
import { createRocketChatProvider } from "@/providers/rocketchat";

const provider = createRocketChatProvider();
const parser = new NLParser(provider.workflowTemplates);

describe("NLParser", () => {
  it("matches 'onboard new team members' to onboard-team-member", () => {
    const results = parser.parse("onboard new team members");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].workflow.id).toBe("onboard-team-member");
  });

  it("matches 'chatbot reply messages' to minimal-chatbot", () => {
    const results = parser.parse("chatbot reply messages");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].workflow.id).toBe("minimal-chatbot");
  });

  it("matches 'cicd build deploy pipeline' to cicd-notifier", () => {
    const results = parser.parse("cicd build deploy pipeline");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].workflow.id).toBe("cicd-notifier");
  });

  it("matches 'customer support' to customer-support-bot", () => {
    const results = parser.parse("customer support");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].workflow.id).toBe("customer-support-bot");
  });

  it("matches 'moderate content' to content-moderation", () => {
    const results = parser.parse("moderate content");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].workflow.id).toBe("content-moderation");
  });

  it("matches 'standup daily scrum' to team-standup", () => {
    const results = parser.parse("standup daily scrum");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].workflow.id).toBe("team-standup");
  });

  it("matches 'webhook integration' to webhook-integration", () => {
    const results = parser.parse("webhook integration");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].workflow.id).toBe("webhook-integration");
  });

  it("matches 'upload files' to file-sharing", () => {
    const results = parser.parse("upload files");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].workflow.id).toBe("file-sharing");
  });

  it("matches 'analytics report' to analytics-reporter", () => {
    const results = parser.parse("analytics report");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].workflow.id).toBe("analytics-reporter");
  });

  it("matches 'search and pin messages' to message-search", () => {
    const results = parser.parse("find message pin react review");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].workflow.id).toBe("message-search");
  });

  it("matches 'manage channels' to channel-management", () => {
    const results = parser.parse("manage channels");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].workflow.id).toBe("channel-management");
  });

  it("parseMultiple deduplicates results", () => {
    const results = parser.parseMultiple([
      "onboard users",
      "send notifications",
      "onboarding",
    ]);
    const ids = results.map((r) => r.workflow.id);
    const unique = new Set(ids);
    expect(ids.length).toBe(unique.size);
  });

  it("returns empty for completely unrelated input", () => {
    const results = parser.parse("quantum computing algorithms");
    expect(results.length).toBe(0);
  });
});
