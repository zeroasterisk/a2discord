# A2Discord Roadmap

## Phase 1 — MVP ✅ Complete

Foundation: Discord bot with A2UI catalog rendering, deterministic demo, full test coverage.

- [x] Project scaffolding (TypeScript + Bun)
- [x] Discord bot (connect, receive messages, reply)
- [x] A2A client integration
- [x] A2UI Discord catalog (7 components)
- [x] DiscordCatalogRenderer
- [x] A2H intent → Discord rendering
- [x] Demo bot (deterministic, all patterns)
- [x] Test suite (134 tests: unit + integration + E2E)
- [x] Live E2E verification
- [x] CI setup

## Phase 2 — Agent Integration (Next)

Connect real A2A agents and handle the full interaction lifecycle.

- [ ] Connect real A2A agent (ADK sample)
- [ ] A2UI catalog negotiation (`supportedCatalogIds` in metadata)
- [ ] A2UI `clientEvent` → agent (button clicks, select, modal submit)
- [ ] Thread-per-task lifecycle
- [ ] Streaming via message edits with rate governor
- [ ] Surface state management
- [ ] Authorization timeout handling

## Phase 3 — Production Hardening

Make it deployable and observable.

- [ ] Slash command registration from agent skills
- [ ] Multi-agent routing
- [ ] Error recovery and retry
- [ ] Metrics and observability
- [ ] NPM package publication

## Phase 4 — Advanced Features

Expand beyond text-based interactions.

- [ ] Voice channel integration
- [ ] File/attachment handling
- [ ] Cross-server federation
- [ ] Agent Card → bot profile sync
