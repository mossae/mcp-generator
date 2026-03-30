# MCP Generator

Generate minimal MCP servers for Rocket.Chat that include only the tools your project needs.

## Commands

- `/generate` — Generate a minimal MCP server. Accepts natural language (`--capabilities "onboard users"`) or explicit IDs (`--workflows "minimal-chatbot"`).
- `/list` — Show all 12 available workflows with step counts and token costs.
- `/measure` — Analyze token savings for any combination of workflows.

## Available Workflows

| Workflow | What it does |
|----------|-------------|
| onboard-team-member | Create user, add to role-based channels, send welcome DM |
| customer-support-bot | Handle livechat tickets with escalation/close logic |
| cicd-notifier | Route build notifications, create channels, pin failures |
| team-standup | Collect statuses, post summary, remind silent members |
| content-moderation | Review reports, warn/deactivate based on severity |
| channel-management | Create/update channels, set topics, bulk invite |
| message-search | Search, pin, and react to messages |
| file-sharing | Upload files and notify channels |
| analytics-reporter | Fetch stats and post formatted reports |
| webhook-integration | Set up incoming/outgoing webhooks |
| notification-bot | Broadcast notifications with urgent pinning |
| minimal-chatbot | Read messages and reply (baseline) |

## Key Differentiator

Generated tools contain real decision logic (if/else branching, per-step error handling, retry/skip/rollback strategies) — not just thin API wrappers.

Workflows requiring real-time events generate a monorepo: MCP server + Rocket.Chat App event bridge.
