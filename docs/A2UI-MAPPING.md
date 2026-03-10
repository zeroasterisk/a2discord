# A2UI → Discord Mapping Specification

This document defines how A2UI v0.9 components map to Discord primitives.

## Component Mapping

| A2UI Component | Discord Primitive | Notes |
|---|---|---|
| **Layout** | | |
| Column | Embed (sequential fields/content) | Children rendered top-to-bottom as embed fields |
| Row | ActionRowBuilder | Children rendered as inline fields or button row |
| List | Multiple embed fields | Items as sequential fields |
| **Display** | | |
| Text | Embed description / field value | `variant` maps: h1→title, h2-h5→bold field, body→description, caption→footer |
| Image | Embed image/thumbnail | `variant: "hero"` → setImage, `variant: "thumbnail"` → setThumbnail |
| Icon | Emoji prefix | Maps icon names to Unicode/Discord emoji |
| Divider | Empty embed field `\u200B` | Visual separator |
| **Interactive** | | |
| Button | ButtonBuilder in ActionRow | `variant: "primary"` → Primary, `variant: "danger"` → Danger, else Secondary |
| TextField | Modal TextInputBuilder | `textFieldType: "shortText"` → Short, `"longText"` → Paragraph |
| CheckBox | ButtonBuilder (toggle) | Rendered as toggle button with ☑/☐ prefix |
| Slider | Text display (no Discord equivalent) | Shown as "Volume: 50 (0-100)" |
| DateTimeInput | Text display (no Discord equivalent) | Shown as text prompt |
| ChoicePicker / MultipleChoice | StringSelectMenuBuilder | Options → select menu options, max 25 |
| **Container** | | |
| Card | EmbedBuilder | Container with elevation → embed with color |
| Modal | Discord ModalBuilder | entryPoint → button, content → modal fields |
| Tabs | Multiple embeds with nav buttons | Each tab → embed, buttons to switch |

## A2H Intent → Rendering Behavior

| Intent | Embed Color | Title Prefix | Extra Components | Behavior |
|---|---|---|---|---|
| INFORM | Blue (0x3498db) | ℹ️ | None | Fire-and-forget notification |
| AUTHORIZE | Orange (0xe67e22) | 🔐 | Approve/Deny buttons | Requires user action |
| COLLECT | Orange (0xe67e22) | 📝 | "Provide Info" button → modal | Opens modal for input |
| RESULT | Green/Red (0x2ecc71/0xe74c3c) | ✅/❌ | None | Success/failure indicator |
| ESCALATE | Yellow (0xf1c40f) | ⚠️ | Thread creation | Creates thread for tracking |

## A2UI Component Tree → Discord Message

A2UI uses a flat component array with ID references. Discord uses a simpler embed + components model.

### Resolution Strategy

1. Walk the component tree starting from `id: "root"`
2. Each `Card` becomes a separate `EmbedBuilder`
3. `Text` with `variant: "h1"` becomes embed title
4. `Text` with `variant: "body"` becomes embed description
5. `Button` components in a `Row` become an `ActionRowBuilder`
6. `TextField` components trigger modal rendering
7. `ChoicePicker` / `MultipleChoice` become `StringSelectMenuBuilder`
8. Components without Discord equivalents get text fallbacks

### Discord Limits

- Max 10 embeds per message
- Max 5 ActionRows per message
- Max 5 buttons per ActionRow
- Max 25 options per SelectMenu
- Max 4096 chars in embed description
- Max 256 chars in embed title
- Max 25 fields per embed

## Wire Format

A2UI components arrive in A2A message data parts:

```json
{
  "role": "agent",
  "parts": [{
    "type": "data",
    "data": {
      "a2ui": {
        "version": "0.9",
        "components": [
          { "id": "root", "component": "Column", "children": ["card1"] },
          { "id": "card1", "component": "Card", "child": "card1-content" },
          { "id": "card1-content", "component": "Column", "children": ["title1", "body1"] },
          { "id": "title1", "component": "Text", "text": "Hello", "variant": "h1" },
          { "id": "body1", "component": "Text", "text": "World", "variant": "body" }
        ]
      }
    }
  }],
  "metadata": { "intent": "INFORM" }
}
```
