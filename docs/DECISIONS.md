# Architecture Decision Records

## ADR-001: Standalone Transport Adapter (not framework integration)

**Date:** 2026-03-08
**Status:** Accepted
**Context:** Should a2discord be a standalone service, an agent framework integration (e.g., ADK plugin), or an A2A protocol extension?

**Options considered:**

1. **Standalone service (transport adapter)** — separate process between Discord and any A2A agent
2. **Framework integration** — library running inside the agent process (e.g., ADK extension)
3. **A2A protocol extension** — Discord transport semantics added to the A2A spec

**Decision:** Standalone transport adapter.

**Rationale:**

- a2discord is a **transport adapter** — the same pattern as a2a-relay. The relay translates WebSocket↔A2A. a2discord translates Discord↔A2A. The agent stays pure A2A and never knows what surface it's talking to.
- **Framework integration** defeats the purpose of A2A as an abstraction layer. It ties to one framework, pollutes agent code with Discord concerns, and requires a separate integration for every framework.
- **A2A protocol extension** is the wrong layer. A2A is deliberately transport-agnostic — adding Discord specifics to the protocol violates that principle. Also impractical: we don't control the A2A spec timeline.
- The adapter owns **Discord state** (which message has which buttons, which thread maps to which task). The agent owns **task state**. Clean separation.
- A2H and A2UI are the bridge: the agent says "this needs AUTHORIZE" (A2H) or sends a button component (A2UI). The adapter translates to Discord primitives. If we later build `a2slack` or `a2teams`, the agent code doesn't change — only the adapter does.
- The ADK sample agent should prove this: it works with a2discord without importing a single Discord type.

**Consequences:**

- Extra deployment to manage (mitigated: single container, simple config)
- Extra network hop (mitigated: adapter and agent typically co-located)
- Interaction state split between adapter and agent (mitigated: clean ownership — adapter owns Discord state, agent owns task state)
- Optional: a thin `a2h` hints library (no Discord deps) can help agents emit well-structured A2H/A2UI metadata without coupling to Discord

---

## ADR-002: TypeScript (discord.js)

**Date:** 2026-03-08
**Status:** Accepted
**Context:** Python (discord.py, ADK compat) or TypeScript (discord.js, more mature Discord support)?

**Decision:** TypeScript with discord.js.

**Rationale:**

- Since the adapter is a standalone transport (ADR-001), the language doesn't need to match the agent framework. The agent speaks A2A over HTTP — any language works on either side.
- discord.js is the most mature, best-maintained Discord library with the strongest Components V2 support.
- TypeScript gives better type safety for the complex Discord interaction models.
- Large ecosystem of Discord tooling in JS/TS.

**Consequences:**

- Project scaffold will change from Python/uv to TypeScript/bun.
- Sample ADK agent remains Python — proving the language-agnostic point.

---

## ADR-003: Operator-managed bot tokens (for now)

**Date:** 2026-03-08
**Status:** Accepted
**Context:** Who creates and manages the Discord bot registration?

**Decision:** Operators bring their own bot token. a2discord does not manage bot registration.

**Rationale:**

- Simplest starting point — operators create a Discord application, get a token, configure a2discord.
- Discord bot creation requires manual steps (developer portal) that are hard to automate well.
- Future: end users could set up a proxy to any agent as long as they have access via credentials. This implies a future multi-tenant/self-service model, but we don't need to build that yet.

**Consequences:**

- Setup docs must include Discord bot creation walkthrough.
- Config takes a bot token as input.
- Future ADR will address self-service/proxy model.

---

## ADR-004: Multi-agent routing — deferred

**Date:** 2026-03-08
**Status:** Deferred
**Context:** Should one Discord bot route to multiple A2A agents, or one bot per agent?

**Decision:** Leave open. Start with single-agent, experiment to discover the right pattern.

**Consequences:**

- Config schema should not prevent multi-agent (use an `agents[]` array, not a single agent URL).
- Phase 1 focuses on single-agent flows.
- Revisit after real-world usage in the test Discord server.

---

## ADR-005: Preliminary A2H hints format

**Date:** 2026-03-08
**Status:** Accepted (preliminary)
**Context:** A2H conventions aren't formalized yet. How do agents signal interaction intent (INFORM, COLLECT, AUTHORIZE, ESCALATE, RESULT) to the adapter?

**Decision:** Define a pragmatic metadata schema now, mark it as preliminary, align with A2H spec when it solidifies.

**Format:** A2A message parts include a `metadata` field. We use a `a2h` key:

```json
{
  "parts": [{
    "kind": "text",
    "text": "Deploy to production?",
    "metadata": {
      "a2h": {
        "intent": "authorize",
        "options": ["approve", "deny"],
        "timeout_seconds": 300
      }
    }
  }]
}
```

Intent-specific metadata:
- **INFORM** — no extra fields needed (default behavior)
- **COLLECT** — `fields: [{ name, label, required, type }]`
- **AUTHORIZE** — `options: string[]`, `timeout_seconds`
- **ESCALATE** — `reason`, `urgency: "low" | "medium" | "high"`
- **RESULT** — `status: "success" | "failure"`, `original_message_ref`

> ⚠️ **Preliminary.** This schema will evolve. When A2H conventions formalize, we'll publish a migration guide. TODO: track A2H spec progress and align.

**Consequences:**

- Agents can signal intent today without waiting for spec
- Schema is simple enough to be forward-compatible
- TODO: versioning strategy for breaking changes
- TODO: fallback behavior when `a2h` metadata is absent (treat as INFORM)

---

## ADR-006: Streaming strategy — buffered edits with rate-limit governor

**Date:** 2026-03-08
**Status:** Accepted
**Context:** A2A streaming sends chunks rapidly, but Discord rate-limits message edits (~5 per 5s per channel). How do we handle this?

**Decision:** Buffer streamed chunks and flush edits on a governor that matches Discord's rate limits. Configurable per-deployment.

**Default behavior:**
1. First chunk → send message + show typing indicator
2. Subsequent chunks → buffer in memory
3. Governor flushes buffer as a message edit at the max safe rate (~1 edit/second)
4. Final chunk → flush immediately, remove typing indicator

**Config:**
```yaml
adapter:
  streaming:
    strategy: "buffer"          # "buffer" | "typing-then-post" | "disabled"
    flush_interval_ms: 1000     # how often to flush buffered edits
    max_edit_rate: 5            # edits per 5s (matches Discord limit)
```

**Strategies:**
- **`buffer`** (default) — stream edits at governed rate. Best UX for conversational agents.
- **`typing-then-post`** — show typing indicator during stream, post final message only. Lower API usage, but user sees nothing until done.
- **`disabled`** — no streaming, wait for complete response. Simplest.

**Consequences:**
- Default works well out of the box for most agents
- Operators with high-traffic bots can switch to `typing-then-post` to reduce API calls
- Governor prevents 429s without requiring agents to know about Discord limits
