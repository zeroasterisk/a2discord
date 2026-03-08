# A2Discord Roadmap

## Phase 1 — MVP (2 weeks)

Basic adapter: receive Discord messages, forward as A2A tasks, render text responses.

- [ ] Project scaffolding (Python + uv + discord.py)
- [ ] Basic Discord bot (connect, receive messages, reply)
- [ ] A2A client integration (send tasks, receive responses)
- [ ] Response rendering (text → message, structured → embed)
- [ ] ADK sample agent (echo + simple tool use)
- [ ] Deploy to test Discord server
- [ ] CI setup (lint, test)

**Goal:** A working bot that forwards messages to an A2A agent and posts responses.

## Phase 2 — Rich Interactions (2 weeks)

A2H patterns with Discord components.

- [ ] AUTHORIZE: button rows (✅/❌) with outcome editing
- [ ] COLLECT: modal forms from schema
- [ ] ESCALATE: mention/ping + thread creation
- [ ] RESULT: edit original message with outcome
- [ ] Thread-per-task lifecycle
- [ ] Streaming via message edits
- [ ] Authorization timeout handling

**Goal:** Full A2H interaction patterns working in Discord.

## Phase 3 — A2UI Rendering (2 weeks)

Map A2UI components to Discord embeds and components.

- [ ] Container → embed mapping
- [ ] Button/action row rendering
- [ ] Select menu rendering
- [ ] Media gallery → attachment embeds
- [ ] Graceful fallback for unsupported components
- [ ] Component interaction → A2A message forwarding

**Goal:** Rich UI rendering from A2UI specs.

## Phase 4 — Multi-agent (future)

- [ ] Multiple agents per server
- [ ] Agent discovery via slash commands
- [ ] Per-channel agent routing
- [ ] Inter-agent communication via Discord channels
- [ ] Agent Card → bot profile sync
