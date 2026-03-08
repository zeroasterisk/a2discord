# a2discord

**Discord adapter for A2A agents** — map any agent to a Discord bot using [A2A](https://github.com/google/A2A), A2UI, and A2H conventions.

## What This Is

**Not a bridge bot.** An adapter layer that any A2A-compliant agent plugs into.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Any A2A Agent   │◄───►│  a2discord       │◄───►│  Discord API │
│  (ADK, LangGraph,│     │  Adapter         │     │             │
│   CrewAI, etc.)  │     │                  │     │             │
└─────────────────┘     └──────────────────┘     └─────────────┘
        A2A                   Translate              Discord
     JSON-RPC              A2A ↔ Discord           Events/REST
```

**Agent developers speak A2A.** The adapter handles Discord translation.

## Key Features

- **A2A Protocol** — Tasks, messages, streaming, agent cards all map to Discord primitives
- **A2H Conventions** — Human-in-the-loop patterns (approve/deny, collect input, escalate) rendered as Discord components
- **A2UI Rendering** — Structured UI components → Discord embeds, buttons, modals, select menus, threads
- **Thread-per-task** — Each A2A task gets its own Discord thread for lifecycle isolation

## A2H → Discord

| A2H Intent | Discord Primitive |
|------------|-------------------|
| INFORM | Embed or plain message |
| COLLECT | Modal form or select menus |
| AUTHORIZE | Button row (✅/❌) + optional thread |
| ESCALATE | Mention/ping, open thread |
| RESULT | Edit original message with outcome |

## A2UI → Discord Components

| A2UI Component | Discord Component |
|----------------|-------------------|
| Container, Section | Embed |
| Button (up to 5/row) | Action Row → Buttons |
| Select Menu | Dropdown (string, user, role, channel) |
| Text Display | Embed field or message content |
| Modal/Form | Discord Modal (up to 5 text inputs) |
| Media Gallery | Attachment embeds |

## Quick Start

```bash
# Install dependencies
uv sync

# Configure
cp .env.example .env
# Edit .env with your Discord bot token and A2A agent URL

# Run
uv run python -m a2discord
```

## Architecture

See [docs/DESIGN.md](docs/DESIGN.md) for the full architecture and mapping specification.

See [docs/ROADMAP.md](docs/ROADMAP.md) for the development plan.

## License

MIT
