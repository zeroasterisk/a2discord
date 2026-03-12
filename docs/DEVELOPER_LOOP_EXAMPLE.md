# Developer Loop Example: Agent Asking HITL Questions

This example shows an agent guiding a developer through a design workflow using Human-in-the-Loop (HITL) patterns on Discord. The agent collects design decisions and requests explicit approval before publishing.

---

## The Scenario

You're building a **code generation agent** that:
1. COLLECTs design decisions (language, framework, architecture style)
2. Generates code based on answers
3. AUTHORIZEs before publishing the result to a public repo

The agent never touches Discord — it speaks A2UI. a2discord renders everything natively.

---

## Full Developer Loop Walkthrough

### Step 1: COLLECT — Gather Design Decisions

The agent starts by asking a series of questions. It composes these as `DiscordSelectMenu` and `DiscordModal` components.

#### Question 1: Primary Language

```json
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "design-q1",
      "catalogId": "https://github.com/zeroasterisk/a2discord/catalog/v1/discord_catalog.json"
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "design-q1",
      "components": [{
        "id": "root",
        "component": "DiscordMessage",
        "textFallback": "What language should we use? Reply: typescript, python, elixir, or go",
        "embeds": [{
          "id": "q1-embed",
          "component": "DiscordEmbed",
          "title": "🔧 Design Question 1 of 3",
          "description": "What primary language should the generated project use?",
          "color": "#e67e22",
          "footer": "Design Session • Step 1"
        }],
        "components": [{
          "id": "lang-row",
          "component": "DiscordActionRow",
          "children": [{
            "id": "lang-select",
            "component": "DiscordSelectMenu",
            "customId": "design-language",
            "placeholder": "Choose a language...",
            "options": [
              { "label": "TypeScript", "value": "typescript", "description": "Node.js / Bun runtime", "emoji": "📘" },
              { "label": "Python", "value": "python", "description": "FastAPI or Flask", "emoji": "🐍" },
              { "label": "Elixir", "value": "elixir", "description": "Phoenix or Plug", "emoji": "💜" },
              { "label": "Go", "value": "go", "description": "Gin or standard http", "emoji": "🐹" }
            ]
          }]
        }]
      }]
    }
  }
]
```

**After the user selects "TypeScript"**, a2discord sends the agent a `clientEvent`:

```json
{
  "type": "clientEvent",
  "surfaceId": "design-q1",
  "event": {
    "type": "select",
    "customId": "design-language",
    "values": ["typescript"]
  }
}
```

The agent acknowledges and locks in the choice (disabling the select to show it's final):

```json
[
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "design-q1",
      "components": [{
        "id": "root",
        "component": "DiscordMessage",
        "embeds": [{
          "id": "q1-embed",
          "component": "DiscordEmbed",
          "title": "✅ Language: TypeScript",
          "description": "Got it — TypeScript selected.",
          "color": "#2ecc71",
          "footer": "Design Session • Step 1 Complete"
        }],
        "components": []
      }]
    }
  }
]
```

#### Question 2: Framework Style

The agent surfaces the next question in a new surface:

```json
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "design-q2",
      "catalogId": "https://github.com/zeroasterisk/a2discord/catalog/v1/discord_catalog.json"
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "design-q2",
      "components": [{
        "id": "root",
        "component": "DiscordMessage",
        "textFallback": "What architecture pattern? Reply: api, fullstack, or library",
        "embeds": [{
          "id": "q2-embed",
          "component": "DiscordEmbed",
          "title": "🏗️ Design Question 2 of 3",
          "description": "What architecture pattern should the project follow?",
          "color": "#e67e22",
          "footer": "Design Session • Step 2"
        }],
        "components": [{
          "id": "arch-row",
          "component": "DiscordActionRow",
          "children": [{
            "id": "arch-select",
            "component": "DiscordSelectMenu",
            "customId": "design-arch",
            "placeholder": "Choose an architecture...",
            "options": [
              { "label": "REST API", "value": "api", "description": "Express/Hono API server", "emoji": "🔌" },
              { "label": "Full Stack", "value": "fullstack", "description": "API + React frontend", "emoji": "🌐" },
              { "label": "Library", "value": "library", "description": "Reusable npm package", "emoji": "📦" }
            ]
          }]
        }]
      }]
    }
  }
]
```

#### Question 3: Free-text Details (Modal)

For open-ended questions, the agent uses a button → modal flow:

```json
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "design-q3",
      "catalogId": "https://github.com/zeroasterisk/a2discord/catalog/v1/discord_catalog.json"
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "design-q3",
      "components": [{
        "id": "root",
        "component": "DiscordMessage",
        "textFallback": "Describe any special requirements for this project.",
        "embeds": [{
          "id": "q3-embed",
          "component": "DiscordEmbed",
          "title": "📝 Design Question 3 of 3",
          "description": "Any special requirements? Click below to describe them.",
          "color": "#e67e22",
          "footer": "Design Session • Step 3"
        }],
        "components": [{
          "id": "q3-row",
          "component": "DiscordActionRow",
          "children": [{
            "id": "open-modal-btn",
            "component": "DiscordButton",
            "label": "✏️ Add Requirements",
            "style": "primary",
            "customId": "open-requirements-modal"
          }]
        }]
      }]
    }
  }
]
```

When the user clicks "Add Requirements", a2discord opens a modal:

```json
{
  "id": "requirements-modal",
  "component": "DiscordModal",
  "title": "Project Requirements",
  "customId": "requirements-submit",
  "children": [
    {
      "id": "project-name",
      "component": "DiscordTextInput",
      "label": "Project Name",
      "customId": "name",
      "style": "short",
      "placeholder": "my-awesome-api",
      "required": true
    },
    {
      "id": "special-notes",
      "component": "DiscordTextInput",
      "label": "Special Requirements",
      "customId": "notes",
      "style": "paragraph",
      "placeholder": "e.g. needs auth, rate limiting, multi-tenant...",
      "required": false
    }
  ]
}
```

The modal submit returns a `clientEvent` with all field values:

```json
{
  "type": "clientEvent",
  "surfaceId": "design-q3",
  "event": {
    "type": "modalSubmit",
    "customId": "requirements-submit",
    "fields": {
      "name": "my-agent-api",
      "notes": "needs JWT auth and rate limiting per API key"
    }
  }
}
```

---

### Step 2: Agent Summarizes the Plan

After collecting all three answers, the agent shows a summary before generating anything:

```json
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "design-summary",
      "catalogId": "https://github.com/zeroasterisk/a2discord/catalog/v1/discord_catalog.json"
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "design-summary",
      "components": [{
        "id": "root",
        "component": "DiscordMessage",
        "textFallback": "Plan: TypeScript REST API named 'my-agent-api' with JWT auth and rate limiting. Generating...",
        "embeds": [{
          "id": "summary-embed",
          "component": "DiscordEmbed",
          "title": "📋 Design Summary",
          "description": "Here's what I'll generate. Give me a moment...",
          "color": "#3498db",
          "fields": [
            { "name": "Language", "value": "TypeScript", "inline": true },
            { "name": "Architecture", "value": "REST API", "inline": true },
            { "name": "Project Name", "value": "`my-agent-api`", "inline": true },
            { "name": "Special Requirements", "value": "JWT auth, rate limiting per API key", "inline": false }
          ],
          "footer": "Generating project scaffold..."
        }]
      }]
    }
  }
]
```

---

### Step 3: AUTHORIZE — "Ready to Publish?"

After generating the code, the agent asks for explicit approval before pushing to GitHub.

```json
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "publish-auth",
      "catalogId": "https://github.com/zeroasterisk/a2discord/catalog/v1/discord_catalog.json"
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "publish-auth",
      "components": [{
        "id": "root",
        "component": "DiscordMessage",
        "textFallback": "Ready to publish my-agent-api to GitHub? Reply APPROVE or DENY.",
        "embeds": [{
          "id": "auth-embed",
          "component": "DiscordEmbed",
          "title": "🔐 Ready to Publish?",
          "description": "The project scaffold is ready. Should I push it to a new GitHub repo?",
          "color": "#e67e22",
          "fields": [
            { "name": "Repo", "value": "`github.com/you/my-agent-api`", "inline": true },
            { "name": "Visibility", "value": "Private (you can change later)", "inline": true },
            { "name": "Files", "value": "14 files generated", "inline": true }
          ],
          "footer": "This action creates a GitHub repository"
        }],
        "components": [{
          "id": "auth-actions",
          "component": "DiscordActionRow",
          "children": [
            {
              "id": "approve-btn",
              "component": "DiscordButton",
              "label": "✅ Publish to GitHub",
              "style": "success",
              "customId": "publish-approve"
            },
            {
              "id": "deny-btn",
              "component": "DiscordButton",
              "label": "❌ Not Yet",
              "style": "danger",
              "customId": "publish-deny"
            }
          ]
        }]
      }]
    }
  }
]
```

**On APPROVE**, the agent disables the buttons and starts publishing:

```json
[
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "publish-auth",
      "components": [{
        "id": "root",
        "component": "DiscordMessage",
        "embeds": [{
          "id": "auth-embed",
          "component": "DiscordEmbed",
          "title": "✅ Publishing...",
          "description": "Creating `my-agent-api` on GitHub. This will take a few seconds.",
          "color": "#2ecc71",
          "footer": "Approved — publishing now"
        }],
        "components": []
      }]
    }
  }
]
```

Then, when done:

```json
[
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "publish-auth",
      "components": [{
        "id": "root",
        "component": "DiscordMessage",
        "embeds": [{
          "id": "auth-embed",
          "component": "DiscordEmbed",
          "title": "🎉 Published!",
          "description": "[github.com/you/my-agent-api](https://github.com/you/my-agent-api)\n\nRepo created, scaffold pushed, branch protection enabled.",
          "color": "#2ecc71",
          "fields": [
            { "name": "Default Branch", "value": "`main`", "inline": true },
            { "name": "Visibility", "value": "Private", "inline": true },
            { "name": "Next Step", "value": "`git clone` and `bun install`", "inline": true }
          ],
          "footer": "✅ Done"
        }]
      }]
    }
  }
]
```

**On DENY**, the agent acknowledges and offers alternatives:

```json
[
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "publish-auth",
      "components": [{
        "id": "root",
        "component": "DiscordMessage",
        "embeds": [{
          "id": "auth-embed",
          "component": "DiscordEmbed",
          "title": "⏸️ Held",
          "description": "No problem. The scaffold is saved locally. Say `publish` when ready, or `restart` to change the design.",
          "color": "#95a5a6",
          "footer": "Waiting for your call"
        }],
        "components": []
      }]
    }
  }
]
```

---

## Key Patterns

### COLLECT Loop
- Use `DiscordSelectMenu` for structured choices (avoid free-form when possible)
- Use button → `DiscordModal` for free-text input
- After each answer: **lock the surface** (remove interactive components) to prevent re-submission
- Surface per question = cleaner UX than cramming everything into one message

### AUTHORIZE Gate
- Orange `#e67e22` embed signals "decision required"
- Include enough context in the embed (what will happen, what will be created)
- **Disable buttons immediately** on click — Discord has a 3s window before interactions expire
- Update to green `#2ecc71` on approve, grey `#95a5a6` on deny
- Always give a "not yet" path with next steps — don't dead-end the user

### Surface Lifecycle
```
createSurface → updateComponents (interactive) → updateComponents (locked/result)
```
Each stage transition happens via `updateComponents` on the same `surfaceId`. The surface persists in Discord until you delete it or the channel is archived.

### ClientEvent Round-Trip
```
Agent sends A2UI  →  a2discord renders to Discord
User interacts    →  a2discord sends clientEvent to agent
Agent processes   →  Agent sends next A2UI updateComponents
```
Your agent state machine drives the loop. a2discord is just the render layer.

---

## Wiring It to Your Agent

```typescript
// In your A2A task handler:
app.post('/tasks/send', async (req, res) => {
  const task = req.body;
  const userMessage = task.message.parts.find(p => p.type === 'text')?.text ?? '';
  const clientEvent = task.message.parts.find(p => p.type === 'data')?.data?.clientEvent;

  if (clientEvent) {
    // User clicked a button or submitted a form
    const next = await designLoop.handleEvent(clientEvent);
    return res.json(agentResponse(next));
  }

  if (userMessage === 'start') {
    const next = await designLoop.start();
    return res.json(agentResponse(next));
  }

  // ... other handlers
});

function agentResponse(a2uiMessages: object[]): object {
  return {
    role: 'agent',
    parts: [
      { type: 'data', data: { a2ui: a2uiMessages } },
      { type: 'text', text: 'Rendering UI...' }  // fallback text
    ]
  };
}
```

---

## See Also

- [Developer Guide](DEVELOPER_GUIDE.md) — component reference and quick start
- [End-to-End Walkthrough](END_TO_END_WALKTHROUGH.md) — traced interaction through every layer
- [A2UI Mapping](A2UI-MAPPING.md) — full component catalog mapping
