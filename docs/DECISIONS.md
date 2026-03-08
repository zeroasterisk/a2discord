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
