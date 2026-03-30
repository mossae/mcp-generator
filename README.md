# MCP Generator

Generate minimal MCP servers for Rocket.Chat with only the tools your project needs. Reduces context bloat by 80-95%.

## The Problem

Existing MCP servers expose all 547 Rocket.Chat API endpoints, burning ~115k tokens per agent loop. Most projects need 2-10 tools. Every unused tool definition wastes tokens and money on every agentic iteration.

## The Solution

This generator produces production-ready MCP servers covering **only** the workflows you select. Generated tools contain real decision logic — not thin API wrappers.

## Quick Start

```bash
npm install
npx tsx src/index.ts generate --capabilities "onboard new team members" --output ./my-server
```

Or with explicit workflow IDs:

```bash
npx tsx src/index.ts generate --workflows "minimal-chatbot,cicd-notifier" --output ./my-server
```

Or with a config file (`.mcp-generator.yaml`):

```yaml
provider: rocketchat
capabilities:
  - onboard new members
  - CI/CD notifications
output: ./my-server
name: my-rc-mcp
```

```bash
npx tsx src/index.ts generate
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `generate` | Generate a minimal MCP server |
| `list` | Show all available workflows with token costs |
| `measure --all` | Token savings comparison table |
| `measure --capabilities "..."` | Measure savings for natural language input |

## Available Workflows

| Workflow | Steps | Tokens | Savings | Features |
|----------|-------|--------|---------|----------|
| onboard-team-member | 5 | ~184 | 88.8% | decision logic |
| customer-support-bot | 5 | ~163 | 90.1% | decision, events, retry |
| cicd-notifier | 5 | ~162 | 90.2% | decision, retry |
| team-standup | 5 | ~137 | 91.7% | retry |
| content-moderation | 6 | ~138 | 91.6% | decision, events |
| channel-management | 5 | ~145 | 91.2% | decision |
| message-search | 3 | ~128 | 92.2% | |
| file-sharing | 3 | ~120 | 92.7% | |
| analytics-reporter | 4 | ~108 | 93.4% | decision, retry |
| webhook-integration | 4 | ~139 | 91.6% | |
| notification-bot | 2 | ~126 | 92.4% | decision |
| minimal-chatbot | 3 | ~98 | 94.1% | retry |

## What Makes This Different

Other generators produce thin API wrappers:

```typescript
// Thin wrapper
server.tool("onboard_user", {}, async ({ username, channels }) => {
  await client.post("/api/v1/users.create", { username });
  for (const ch of channels) {
    await client.post("/api/v1/channels.invite", { roomId: ch });
  }
});
```

This generator produces platform-level tools with real logic:

```typescript
// Generated: decision logic, error handling, rollback
server.tool("rc_onboard_team_member", {}, async ({ username, email, role }) => {
  const existing = await client.get("/api/v1/users.info", { username });

  if (existing?.user != null) {
    userId = existing.user._id;
  } else {
    const created = await client.post("/api/v1/users.create", {
      username, email, password: crypto.randomUUID().slice(0, 16),
    });
    userId = created.user._id;
  }

  // Role-based channel selection, per-channel error handling,
  // welcome DM with skip-on-failure strategy
});
```

## Architecture

```
User input (NL / config / flags)
    │
    ├─ [NL Parser] ── fuse.js fuzzy matching → workflow templates
    │
    ├─ [ProviderSpec] ── generic platform interface (RC first impl)
    │
    ├─ [WorkflowTemplate] ── decision points, error handlers, rollback
    │
    ├─ [Code Emitter] ── Handlebars → TypeScript with real if/else/try/catch
    │
    ├─ [Token Counter] ── measures and reports savings
    │
    └─ Generated Output: MCP Server + RC App (if events needed)
```

## Generated Output

Single workflow (no events):

```
my-server/
  server/src/
    index.ts          # MCP server entry
    client.ts         # RC HTTP client
    tools/
      minimal-chatbot.ts
  package.json
  gemini-extension.json
  .env.example
```

Workflows with real-time events (monorepo):

```
my-server/
  server/            # MCP server
  rc-app/            # Rocket.Chat App event bridge
    app.json
    src/index.ts     # Listens for events, forwards via HTTP callback
  package.json
  gemini-extension.json
```

## gemini-cli Integration

Install generated server as a gemini-cli extension:

```bash
gemini extensions install ./my-server
```

Or configure manually in `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "rocketchat": {
      "command": "node",
      "args": ["./my-server/server/dist/index.js"]
    }
  }
}
```

## Development

```bash
npm install
npm test              # 88 tests
npm run test:workflows # 54 workflow tests
npm run benchmark     # token savings report
```

## Token Savings Benchmark

Combo scenarios across a 10-iteration agent loop:

| Scenario | Tools | Tokens | Full | Savings |
|----------|-------|--------|------|---------|
| Messaging only | 1 | ~98 | ~1648 | 94.1% |
| Support team | 2 | ~301 | ~1648 | 81.7% |
| DevOps | 3 | ~427 | ~1648 | 74.1% |
| Team lead | 3 | ~466 | ~1648 | 71.7% |
| Full admin | 4 | ~575 | ~1648 | 65.1% |

Average single-workflow savings: **91.7%**

## Tech Stack

- TypeScript (strict mode)
- Handlebars (deterministic codegen, zero LLM)
- fuse.js (natural language matching)
- commander + @inquirer/prompts (CLI)
- vitest (88 tests)
- @modelcontextprotocol/sdk (in generated output)
- @rocket.chat/apps-engine (in generated RC App)
