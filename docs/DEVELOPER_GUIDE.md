# Developer Guide

How to make your agent render native Discord UI through a2discord.

**Prerequisites:** You have an agent that can send and receive JSON. That's it.

---

## Quick Start

The fastest path from zero to Discord rendering:

### 1. Run a2discord

```bash
git clone https://github.com/zeroasterisk/a2discord.git
cd a2discord && bun install
cp .env.example .env
# Set DISCORD_TOKEN (see User Guide for bot setup)
# Set A2A_AGENT_URL to your agent's endpoint
bun run dev
```

→ See [User Guide](USER_GUIDE.md) for Discord bot creation and permissions.

### 2. Have your agent respond with A2UI

When your agent receives a message via A2A `tasks/send`, respond with A2UI in the data part:

```json
{
  "role": "agent",
  "parts": [
    {
      "type": "data",
      "data": {
        "a2ui": [
          {
            "version": "v0.9",
            "createSurface": {
              "surfaceId": "my-surface-1",
              "catalogId": "https://github.com/zeroasterisk/a2discord/catalog/v1/discord_catalog.json"
            }
          },
          {
            "version": "v0.9",
            "updateComponents": {
              "surfaceId": "my-surface-1",
              "components": [{
                "id": "root",
                "component": "DiscordMessage",
                "textFallback": "Hello from my agent!",
                "embeds": [{
                  "id": "greeting",
                  "component": "DiscordEmbed",
                  "title": "👋 Hello!",
                  "description": "Your agent is rendering in Discord.",
                  "color": "#3498db"
                }]
              }]
            }
          }
        ]
      }
    },
    {
      "type": "text",
      "text": "Hello from my agent!"
    }
  ]
}
```

That's it. a2discord renders the A2UI JSON as a native Discord embed. The `text` part is a fallback for clients that don't support A2UI.

### 3. Try the demo first

Before wiring up your own agent, run the demo bot to see every pattern in action:

```bash
bun run demo
```

Then type `!quiz`, `!authorize`, `!collect`, or `!info` in Discord. Read the [demo source](../src/sample/) to see how each pattern is composed.

---

## How It Works

### The Big Picture

```
Your Agent  →  A2UI v0.9 JSON  →  a2discord  →  Discord API  →  User sees native UI
User clicks →  Discord event    →  a2discord  →  A2UI clientEvent  →  Your Agent
```

Your agent never imports `discord.js`. It composes UI using the **Discord component catalog** — 7 components that map 1:1 to Discord primitives. a2discord handles the translation.

### Catalog Negotiation

When a2discord connects to your agent, it advertises its catalog:

```json
{
  "a2uiClientCapabilities": {
    "supportedCatalogIds": [
      "https://github.com/zeroasterisk/a2discord/catalog/v1/discord_catalog.json"
    ]
  }
}
```

Your agent can fetch this catalog URL to discover what components are available and their JSON schemas. The key insight: **the same agent given a Slack or web catalog would produce different UI.** Your agent is surface-agnostic.

### Event Flow

1. User sends a message in Discord
2. a2discord wraps it in an A2A `tasks/send` and forwards to your agent
3. Your agent responds with A2UI components
4. a2discord renders them as Discord embeds, buttons, modals, etc.
5. User interacts (clicks a button, submits a form)
6. a2discord translates that into an A2UI `clientEvent` and sends it back
7. Your agent processes the event and can update the surface

→ See [End-to-End Walkthrough](END_TO_END_WALKTHROUGH.md) for a full traced example with wire format.

---

## Deployment Models

### Hosted (Managed Service)

Someone else runs a2discord. Your agent just speaks A2A.

```
┌─────────────┐    A2A JSON-RPC    ┌─────────────┐    Discord API    ┌─────────┐
│  Your Agent  │ ←───────────────→ │  a2discord   │ ←──────────────→ │ Discord │
│  (anywhere)  │                   │  (managed)   │                  │         │
└─────────────┘                    └─────────────┘                   └─────────┘
```

**You provide:** An A2A-compliant endpoint (HTTP)
**Someone else provides:** The Discord bot, a2discord hosting, Discord token management

**Best for:** Agent developers who don't want to manage Discord infrastructure. Your agent just needs an HTTP endpoint that speaks A2A protocol.

**Setup:**
1. Deploy your agent with an A2A endpoint
2. Register your agent URL with the managed a2discord instance
3. Done — your agent renders in Discord

### Self-Hosted

You run everything: your agent and a2discord.

```
┌─────────────┐    A2A JSON-RPC    ┌─────────────┐    Discord API    ┌─────────┐
│  Your Agent  │ ←───────────────→ │  a2discord   │ ←──────────────→ │ Discord │
│  (your infra)│                   │  (your infra)│                  │         │
└─────────────┘                    └─────────────┘                   └─────────┘
```

**You provide:** Everything — agent, a2discord instance, Discord bot token

**Best for:** Full control. Custom Discord server, custom bot identity, custom routing.

**Setup:**
1. [Create a Discord bot](USER_GUIDE.md#1-create-a-discord-bot)
2. Clone and configure a2discord (set `DISCORD_TOKEN`, `A2A_AGENT_URL`)
3. Deploy both services (Docker, bare metal, whatever)
4. `bun run start`

### Co-Located (No A2A Needed)

Your agent and a2discord run in the same process. Skip the network layer entirely.

```
┌──────────────────────────────────┐    Discord API    ┌─────────┐
│  Your Process                    │ ←──────────────→ │ Discord │
│  ┌──────────┐   ┌─────────────┐ │                  │         │
│  │  Agent    │──→│  a2discord  │ │                  │         │
│  │  logic    │←──│  renderer   │ │                  │         │
│  └──────────┘   └─────────────┘ │                  │         │
└──────────────────────────────────┘                  └─────────┘
```

**You provide:** A single process that imports a2discord as a library

**Best for:** Simple agents, demos, prototyping. No network overhead, no A2A ceremony.

**Setup:**
```typescript
import { DiscordCatalogRenderer } from 'a2discord/rendering';

// Your agent emits A2UI directly
const a2ui = myAgent.generateResponse(userMessage);
const discordMessage = renderer.render(a2ui);
await channel.send(discordMessage);
```

### Which Model Should I Pick?

| Consideration | Hosted | Self-Hosted | Co-Located |
|---|---|---|---|
| Agent runs remotely | ✅ | ✅ | ❌ |
| Zero Discord setup | ✅ | ❌ | ❌ |
| Custom bot identity | ❌ | ✅ | ✅ |
| No network overhead | ❌ | ❌ | ✅ |
| Multi-agent support | ✅ | ✅ | ❌ |
| Production scale | ✅ | ✅ | ⚠️ |

---

## Building Your Agent

### The Discord Component Catalog

Your agent composes UI from exactly 7 components:

| Component | What It Creates | Common Use |
|---|---|---|
| `DiscordMessage` | Top-level message | Required root container |
| `DiscordEmbed` | Rich embed card | Info display, questions, results |
| `DiscordButton` | Clickable button | Actions, confirmations, navigation |
| `DiscordActionRow` | Row of buttons/menus | Groups interactive elements |
| `DiscordSelectMenu` | Dropdown selector | Choices, multi-select |
| `DiscordModal` | Popup form | Data collection |
| `DiscordTextInput` | Text field in modal | Free-text input |

→ Full schemas and properties: [`catalog/discord_catalog.json`](../catalog/discord_catalog.json)
→ Mapping to Discord primitives: [A2UI Mapping](A2UI-MAPPING.md)

### Composing a Message

Every response starts with a `DiscordMessage` root component. Nest embeds and interactive components inside it:

```typescript
// TypeScript example — what your agent emits
const response = {
  version: "v0.9",
  updateComponents: {
    surfaceId: "my-surface",
    components: [{
      id: "root",
      component: "DiscordMessage",
      textFallback: "Choose your deployment model",
      embeds: [{
        id: "info",
        component: "DiscordEmbed",
        title: "🚀 Deployment",
        description: "How would you like to deploy?",
        color: "#3498db"
      }],
      components: [{
        id: "row1",
        component: "DiscordActionRow",
        children: [
          { id: "btn-hosted", component: "DiscordButton", label: "☁️ Hosted", style: "primary", customId: "deploy-hosted" },
          { id: "btn-self", component: "DiscordButton", label: "🏠 Self-Hosted", style: "secondary", customId: "deploy-self" },
          { id: "btn-colo", component: "DiscordButton", label: "📦 Co-Located", style: "secondary", customId: "deploy-colo" }
        ]
      }]
    }]
  }
};
```

```python
# Python equivalent
response = {
    "version": "v0.9",
    "updateComponents": {
        "surfaceId": "my-surface",
        "components": [{
            "id": "root",
            "component": "DiscordMessage",
            "textFallback": "Choose your deployment model",
            "embeds": [{
                "id": "info",
                "component": "DiscordEmbed",
                "title": "🚀 Deployment",
                "description": "How would you like to deploy?",
                "color": "#3498db",
            }],
            "components": [{
                "id": "row1",
                "component": "DiscordActionRow",
                "children": [
                    {"id": "btn-hosted", "component": "DiscordButton", "label": "☁️ Hosted", "style": "primary", "customId": "deploy-hosted"},
                    {"id": "btn-self", "component": "DiscordButton", "label": "🏠 Self-Hosted", "style": "secondary", "customId": "deploy-self"},
                    {"id": "btn-colo", "component": "DiscordButton", "label": "📦 Co-Located", "style": "secondary", "customId": "deploy-colo"},
                ],
            }],
        }],
    },
}
```

### Handling Client Events

When a user clicks a button or submits a form, your agent receives a `clientEvent`:

```json
{
  "version": "v0.9",
  "clientEvent": {
    "surfaceId": "my-surface",
    "componentId": "btn-hosted",
    "eventType": "click",
    "value": "deploy-hosted",
    "userId": "172053288110260225"
  }
}
```

Your agent processes this and responds with an `updateComponents` to update the UI. Common pattern:

```typescript
function handleEvent(event: A2UIClientEvent): A2UIMessage {
  switch (event.componentId) {
    case "btn-hosted":
      return makeResultEmbed("☁️ Hosted", "Great choice! Here's how to set up...", "#2ecc71");
    case "btn-self":
      return makeResultEmbed("🏠 Self-Hosted", "Full control. Here's the setup...", "#2ecc71");
    default:
      return makeResultEmbed("Unknown", "Unexpected selection", "#e74c3c");
  }
}
```

### Managing Surfaces

- **One surface per interaction.** Create a surface for each distinct UI (a quiz, a form, a result).
- **Update, don't recreate.** Use `updateComponents` to modify an existing surface (Discord edits the message in place).
- **Remove interactivity** after resolution — send `updateComponents` with `"components": []` to remove buttons.
- **Surface IDs** are yours to define. Use descriptive names: `"quiz-q1"`, `"deploy-confirm"`, `"onboard-step3"`.

---

## Common Patterns

### INFORM — Share Information

Fire-and-forget notification. Blue embed, no buttons.

```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "notify-1",
    "components": [{
      "id": "root",
      "component": "DiscordMessage",
      "embeds": [{
        "id": "info",
        "component": "DiscordEmbed",
        "title": "ℹ️ Build Complete",
        "description": "Deployed `v2.1.0` to production.\n\n**Duration:** 3m 42s\n**Commit:** `abc1234`",
        "color": "#3498db"
      }]
    }]
  }
}
```

### AUTHORIZE — Request Approval

Orange embed with approve/deny buttons. Disable buttons after the user decides.

```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "auth-deploy",
    "components": [{
      "id": "root",
      "component": "DiscordMessage",
      "embeds": [{
        "id": "request",
        "component": "DiscordEmbed",
        "title": "🔐 Deploy to Production?",
        "description": "**Service:** payment-api\n**Version:** v2.1.0\n**Changes:** 3 commits, 2 migrations",
        "color": "#e67e22"
      }],
      "components": [{
        "id": "actions",
        "component": "DiscordActionRow",
        "children": [
          { "id": "approve", "component": "DiscordButton", "label": "✅ Approve", "style": "success", "customId": "auth-approve" },
          { "id": "deny", "component": "DiscordButton", "label": "❌ Deny", "style": "danger", "customId": "auth-deny" }
        ]
      }]
    }]
  }
}
```

On click, update the surface to show the result:

```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "auth-deploy",
    "components": [{
      "id": "root",
      "component": "DiscordMessage",
      "embeds": [{
        "id": "result",
        "component": "DiscordEmbed",
        "title": "✅ Approved",
        "description": "Deploying `payment-api` v2.1.0 to production...",
        "color": "#2ecc71"
      }],
      "components": []
    }]
  }
}
```

### COLLECT — Gather Input

Use a select menu for structured choices:

```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "collect-env",
    "components": [{
      "id": "root",
      "component": "DiscordMessage",
      "embeds": [{
        "id": "prompt",
        "component": "DiscordEmbed",
        "title": "📝 Select Environment",
        "description": "Where should we deploy?",
        "color": "#e67e22"
      }],
      "components": [{
        "id": "row1",
        "component": "DiscordActionRow",
        "children": [{
          "id": "env-select",
          "component": "DiscordSelectMenu",
          "customId": "env-choice",
          "placeholder": "Choose an environment...",
          "options": [
            { "label": "Development", "value": "dev", "description": "dev.example.com", "emoji": "🔧" },
            { "label": "Staging", "value": "staging", "description": "staging.example.com", "emoji": "🧪" },
            { "label": "Production", "value": "prod", "description": "example.com", "emoji": "🚀" }
          ]
        }]
      }]
    }]
  }
}
```

For free-text input, use a modal (triggered by a button click):

```json
{
  "id": "input-modal",
  "component": "DiscordModal",
  "title": "Enter Details",
  "customId": "details-form",
  "children": [
    { "id": "name-input", "component": "DiscordTextInput", "label": "Name", "customId": "name", "style": "short", "required": true },
    { "id": "desc-input", "component": "DiscordTextInput", "label": "Description", "customId": "description", "style": "paragraph", "required": false }
  ]
}
```

---

## Testing

### Local Development

1. **Start with the demo bot:** `bun run demo` — no agent needed, all patterns exercised
2. **Read the demo source:** [`src/sample/`](../src/sample/) shows how each pattern is composed
3. **Wire your agent:** Set `A2A_AGENT_URL` in `.env`, run `bun run dev`
4. **Debug wire format:** The `!a2ui-raw` command dumps the v0.9 JSON your agent emits

### Test Suite

```bash
bun test              # All 134 tests (unit + integration)
bun test:unit         # Unit tests only
bun test:integration  # Integration tests only
bun test:e2e          # E2E (requires running Discord bot)
```

### Validating Your A2UI Output

Before connecting to a2discord, validate that your agent's output matches the catalog schema:

1. Fetch the catalog: `catalog/discord_catalog.json`
2. Validate your `updateComponents` payload against the component schemas
3. Ensure every message has an `id: "root"` component of type `DiscordMessage`
4. Include `textFallback` on the root for graceful degradation

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Agent responds but nothing renders | A2UI not in data part | Wrap A2UI in `parts: [{ type: "data", data: { a2ui: [...] } }]` |
| Buttons don't do anything | Missing `customId` | Every interactive component needs a unique `customId` |
| Modal won't open | Not triggered by interaction | Modals must be shown in response to a button click, not a message |
| Embed is blank | Missing required fields | `DiscordEmbed` needs at least `title` or `description` |
| "Unknown component" warning | Typo in component name | Check spelling: `DiscordEmbed`, not `discord-embed` or `Embed` |
| Select menu shows no options | Empty options array | Provide 1–25 options with `label` and `value` |
| Surface not updating | Wrong `surfaceId` | `updateComponents` surfaceId must match the `createSurface` surfaceId |
| Buttons disappeared | Discord 15-min timeout | Discord disables components after 15 min — re-send if needed |
| Rate limit errors | Too many message edits | Discord allows 5 edits per 5 seconds per channel |

### Discord Limits to Know

- **5 buttons** per ActionRow, **5 ActionRows** per message
- **25 options** per SelectMenu
- **10 embeds** per message
- **5 TextInputs** per Modal
- **4096 chars** in embed description, **256 chars** in title
- **15 minutes** — modal and component interaction timeout
- **5 edits / 5 seconds** — per-channel rate limit

---

## Further Reading

- [End-to-End Walkthrough](END_TO_END_WALKTHROUGH.md) — full traced interaction with wire format
- [A2UI Mapping](A2UI-MAPPING.md) — complete component mapping reference
- [Design](DESIGN.md) — architecture, layer model, state ownership
- [A2UI Spec](https://a2ui.org) — the A2UI protocol
- [A2A Protocol](https://a2a-protocol.org) — agent-to-agent transport
- [Discord Components V2](https://discord.com/developers/docs/components/reference) — Discord's component API
