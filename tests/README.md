# a2discord Test Suite

Three test layers, each serving a different purpose.

## Quick Start

```bash
bun install
bun run test          # unit + integration
bun run test:unit     # unit only
bun run test:integration  # integration only (starts mock A2A server)
bun run test:e2e      # e2e (needs real Discord bot — see below)
```

## Layers

### Unit Tests (`tests/unit/`)

Mock everything. Test each layer in isolation.

- `adapter.test.ts` — core adapter class lifecycle
- `rendering.test.ts` — A2A/A2UI → Discord component rendering
- `protocol.test.ts` — JSON-RPC ↔ Discord event mapping

### Integration Tests (`tests/integration/`)

Uses a real HTTP mock A2A server (started in-process). Tests the full pipeline.

- `task-lifecycle.test.ts` — agent card discovery, tasks/send, SSE streaming
- `a2h-patterns.test.ts` — INFORM/COLLECT/AUTHORIZE/RESULT intent patterns

### E2E Tests (`tests/e2e/`)

Connects to a **real Discord bot** in a test channel. For QA during development.

```bash
# Set up environment
export DISCORD_TOKEN="your-test-bot-token"
export DISCORD_CHANNEL_ID="your-test-channel-id"

# Run all scenarios
bun run test:e2e

# Interactive mode (step-by-step with prompts)
bun run test:e2e -- --interactive

# Single scenario
bun run test:e2e -- --scenario basic-echo

# List scenarios
bun run test:e2e -- --list
```

**Scenarios:**
- `basic-echo` — send message, get text response
- `streaming` — send message, verify streaming edits
- `authorize` — trigger AUTHORIZE flow, click approve/deny
- `collect` — trigger COLLECT flow, submit modal
- `error-handling` — agent down, timeout, malformed response

## Mock A2A Server

The mock server (`tests/fixtures/mock-a2a-server.ts`) is also runnable standalone for local dev:

```bash
bun run tests/fixtures/mock-a2a-server.ts       # default port 9999
bun run tests/fixtures/mock-a2a-server.ts 8080   # custom port
```

It serves:
- `GET /.well-known/agent.json` — agent card
- `POST /` with `tasks/send` — canned JSON-RPC responses
- `POST /` with `tasks/sendSubscribe` — SSE streaming

Configurable scenarios: echo, authorize, collect, inform, result, error, timeout, malformed.

## Test Helpers

- `tests/helpers/discord-mocks.ts` — factories for discord.js objects
- `tests/helpers/a2a-fixtures.ts` — factories for A2A protocol objects
- `tests/helpers/assertions.ts` — custom vitest matchers (`toHaveIntent`, `toBeInState`, etc.)
