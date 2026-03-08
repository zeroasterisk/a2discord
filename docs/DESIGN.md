# A2Discord Design Document

## Overview

a2discord is an adapter that translates between the A2A (Agent-to-Agent) protocol and Discord's API. It enables any A2A-compliant agent to operate as a Discord bot without the agent needing any Discord-specific code.

## Architecture Layers

```
┌─────────────────────────────────────────────┐
│  Layer 4: Interaction (A2H)                 │
│  AUTHORIZE, COLLECT, ESCALATE, INFORM       │
├─────────────────────────────────────────────┤
│  Layer 3: Rendering (A2UI → Discord)        │
│  Components, embeds, buttons, modals        │
├─────────────────────────────────────────────┤
│  Layer 2: Protocol (A2A ↔ Discord)          │
│  JSON-RPC tasks ↔ Discord events            │
├─────────────────────────────────────────────┤
│  Layer 1: Transport                         │
│  discord.py gateway + REST                  │
└─────────────────────────────────────────────┘
```

### Layer 1: Transport

- **Library:** discord.py (Python, for ADK compatibility)
- **Gateway:** WebSocket connection for real-time events
- **REST:** For sending messages, creating threads, managing components
- **Events handled:** `on_message`, `on_interaction` (buttons, modals, selects), `on_thread_create`

### Layer 2: Protocol — A2A ↔ Discord

**Agent Card → Bot Profile**
- Agent name → bot username
- Agent description → bot bio/about
- Agent skills → slash commands (one per skill)
- Agent URL → configured at startup

**Tasks → Threads**
- Each A2A task maps to a Discord thread
- Thread name = task summary or first message
- Thread lifecycle mirrors task lifecycle (working → completed/failed)
- Task ID stored in thread metadata or pinned message

**Messages → Discord Messages**
- A2A `Message` with role `agent` → bot message in thread
- A2A `Message` with role `user` → captured from Discord user message
- Text parts → message content
- Data parts → formatted as code blocks or attachments
- File parts → Discord file attachments

**Streaming → Message Edits**
- A2A `tasks/sendSubscribe` SSE stream
- Each streamed chunk → edit the bot's last message
- Final chunk → finalize message (remove typing indicator)
- Rate-limited to Discord's edit rate (5/5s per channel)

### Layer 3: Rendering — A2UI → Discord Components

Discord supports [Components V2](https://discord.com/developers/docs/components/reference) which map well to A2UI:

| A2UI | Discord | Notes |
|------|---------|-------|
| Container | Embed | Title, description, color, fields |
| Section | Embed field | Inline or block |
| Text Display | Message content or embed field | Markdown supported |
| Button | Button in Action Row | Max 5 per row, 5 rows per message |
| Select Menu | String/User/Role/Channel Select | Max 25 options |
| Modal/Form | Modal | Max 5 text input components |
| Media Gallery | Attachment embeds | Images, files |
| Separator | Embed field separator | Visual break |
| Thumbnail | Embed thumbnail | Small image |

**Limitations & Fallbacks:**
- No custom rendering (charts, canvas, SVG) → fallback to image attachment or text description
- No real-time updates within embeds → edit message on state change
- Max 10 embeds per message
- Max 25 action rows × 5 components
- Modal text inputs only (no checkboxes, dropdowns in modals)
- Select menus: max 25 options, can't mix types

### Layer 4: Interaction — A2H Patterns

A2H (Agent-to-Human) defines conventions for human-in-the-loop interactions:

#### INFORM
**Purpose:** Agent shares information with the human.
**Discord:** Plain message or embed (for structured info).
```
Agent → a2discord: Message with INFORM intent
a2discord → Discord: Send embed with info
```

#### COLLECT
**Purpose:** Agent needs structured input from the human.
**Discord:** Modal form (up to 5 text inputs) or select menu.
```
Agent → a2discord: Message with COLLECT intent + schema
a2discord → Discord: Button "Provide Info" → opens Modal
User fills modal → submits
a2discord → Agent: Message with collected data
```
- Schema fields map to modal text inputs
- For >5 fields: paginated modals or fallback to conversation
- For enum fields: select menu instead of text input
- Validation feedback via ephemeral messages

#### AUTHORIZE
**Purpose:** Agent requests human approval for an action.
**Discord:** Button row with ✅ Approve / ❌ Deny + context embed.
```
Agent → a2discord: Message with AUTHORIZE intent + action details
a2discord → Discord: Embed with details + button row
User clicks ✅ or ❌
a2discord → Agent: Message with authorization decision
a2discord → Discord: Edit message to show outcome (✅ Approved / ❌ Denied)
```
- Optional: open thread for discussion before deciding
- Buttons disabled after decision
- Timeout → auto-deny with notification

#### ESCALATE
**Purpose:** Agent can't proceed, needs human help.
**Discord:** Mention/ping specific user or role + thread.
```
Agent → a2discord: Message with ESCALATE intent + reason
a2discord → Discord: @mention user/role + create thread with context
User responds in thread
a2discord → Agent: Message with human response
```

#### RESULT
**Purpose:** Agent reports final outcome.
**Discord:** Edit the original interaction message with the result.
```
Agent → a2discord: Message with RESULT intent + outcome
a2discord → Discord: Edit original message → show result, collapse buttons
```

## Task Lifecycle in Discord

```
User sends message in channel
  → a2discord creates thread (or uses existing)
  → a2discord sends tasks/send to A2A agent
  → Agent streams response
  → a2discord edits message in thread with streamed content
  → Agent requests AUTHORIZE
  → a2discord posts button row in thread
  → User clicks approve
  → a2discord forwards to agent
  → Agent completes task
  → a2discord posts RESULT, archives thread
```

## Configuration

```yaml
# a2discord.yaml
discord:
  token: ${DISCORD_TOKEN}
  guild_id: ${DISCORD_GUILD_ID}  # optional, for slash command registration

agents:
  - name: my-agent
    url: http://localhost:8080  # A2A endpoint
    channels: ["general"]  # which channels to listen in
    prefix: "!"  # optional command prefix
    slash_commands: true  # register skills as slash commands

adapter:
  thread_per_task: true
  stream_edits: true
  edit_rate_limit: 5  # edits per 5 seconds
  authorize_timeout: 300  # seconds before auto-deny
```

## Error Handling

- A2A agent unreachable → ephemeral error message to user
- Task failed → error embed in thread with details
- Rate limited → queue messages, retry with backoff
- Invalid A2UI component → fallback to text representation
- Modal timeout (15 min Discord limit) → notify user, offer retry
