# User Guide

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ or [Bun](https://bun.sh/) 1.0+
- A Discord account with access to the [Developer Portal](https://discord.com/developers/applications)
- An A2A-compliant agent running somewhere accessible (local or remote)

## 1. Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → give it a name → **Create**
3. Go to **Bot** in the sidebar
4. Click **Reset Token** → copy and save the token (you won't see it again)
5. Under **Privileged Gateway Intents**, enable:
   - **Message Content Intent** (required to read message text)
6. Go to **OAuth2** → **URL Generator**
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`, `Create Public Threads`, `Send Messages in Threads`, `Manage Messages` (for editing), `Add Reactions`
7. Copy the generated URL → open in browser → invite the bot to your server

## 2. Install & Configure

```bash
git clone https://github.com/zeroasterisk/a2discord.git
cd a2discord
bun install

cp .env.example .env
```

Edit `.env`:

```env
# Required
DISCORD_TOKEN=your-bot-token-from-step-1

# Your A2A agent endpoint
A2A_AGENT_URL=http://localhost:8080

# Optional: restrict slash command registration to one server (faster updates)
DISCORD_GUILD_ID=your-server-id
```

> **Tip:** To get a server ID, enable Developer Mode in Discord settings → right-click server → Copy Server ID.

## 3. Run

```bash
# Demo bot (deterministic, no agent needed — great for testing)
bun run demo

# Development (with hot reload, connects to A2A agent)
bun run dev

# Production
bun run build
bun run start
```

## 4. Test

**Demo mode:** Run `bun run demo` to start the deterministic demo bot. It responds to commands like `!quiz`, `!authorize`, `!collect`, etc., demonstrating all A2UI patterns without needing a real agent.

**With an agent:** Send a message in any channel the bot can see. The adapter will:
1. Forward the message to your A2A agent as a task
2. Render the agent's response as a Discord message

## Configuration Reference

See the config schema in [DESIGN.md](DESIGN.md#configuration) for all options including streaming strategy, thread-per-task, and timeouts.

## Setting Up a Sample Agent

The repo includes a sample ADK agent for testing. See `sample/` for details (coming in Phase 1).

For now, any A2A-compliant agent works. Point `A2A_AGENT_URL` at its endpoint and go.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Bot is online but doesn't respond | Check **Message Content Intent** is enabled in Developer Portal |
| "Missing Access" errors | Re-invite bot with correct permissions (step 1.6) |
| Agent timeout | Verify `A2A_AGENT_URL` is reachable from where a2discord runs |
| Rate limit warnings | Adjust `streaming.flush_interval_ms` in config (see [ADR-006](DECISIONS.md#adr-006-streaming-strategy--buffered-edits-with-rate-limit-governor)) |
