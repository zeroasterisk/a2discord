/**
 * demo-bot.ts — A2UI-driven demo bot for exercising Discord capabilities.
 *
 * All responses are now generated as A2UI component JSON and rendered through
 * the A2UIRenderer. This proves the renderer works end-to-end.
 *
 * Commands (prefix with !):
 *   !help          — list all commands
 *   !embed         — basic embed with fields
 *   !buttons       — action row with buttons
 *   !approve       — authorization flow (approve/deny buttons)
 *   !modal         — button that opens a modal form
 *   !select        — select menu
 *   !thread        — create a thread with structured content
 *   !cards         — multiple embeds (card layout)
 *   !status        — status update with color-coded embed
 *   !error         — error embed
 *   !code          — code block in embed
 *   !progress      — simulated progress with message edits
 *   !kitchen-sink  — everything at once
 *   !a2ui-raw      — dump raw A2UI JSON alongside rendered output
 *
 * Run: DISCORD_TOKEN=... bun run src/sample/demo-bot.ts
 */

import {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  type Message,
  type TextChannel,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
} from 'discord.js';
import { A2UIRenderer, type A2UIComponent } from '../rendering/a2ui-renderer.js';

const TOKEN = process.env.DISCORD_TOKEN || process.env.A2DISCORD_BOT_TOKEN;
if (!TOKEN) {
  console.error('Set DISCORD_TOKEN or A2DISCORD_BOT_TOKEN');
  process.exit(1);
}

const CHANNEL_FILTER = process.env.DISCORD_CHANNELS?.split(',').map(s => s.trim()) ?? [];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const renderer = new A2UIRenderer();

// ─── Colors ───
const BLUE = 0x3498db;
const GREEN = 0x2ecc71;
const RED = 0xe74c3c;
const ORANGE = 0xe67e22;
const PURPLE = 0x9b59b6;
const GOLD = 0xf1c40f;

// ─── A2UI builders ───

function a2ui(
  components: A2UIComponent[],
  metadata?: Record<string, unknown>,
): any {
  return renderer.render(components, metadata) as any;
}

// ─── Command handlers ───

const commands: Record<string, (msg: Message) => Promise<void>> = {
  help: async (msg) => {
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: '🤖 a2discord Demo Bot', variant: 'h1' },
      { id: 'desc', component: 'Text', text: 'A2UI-driven demo — all responses rendered through A2UIRenderer.\nNo hardcoded Discord primitives.', variant: 'body' },
      { id: 'embed-cmd', component: 'Text', text: '`!embed` — Rich embed with fields', variant: 'body' },
      { id: 'buttons-cmd', component: 'Text', text: '`!buttons` — Action row with buttons', variant: 'body' },
      { id: 'approve-cmd', component: 'Text', text: '`!approve` — Approve/deny flow', variant: 'body' },
      { id: 'modal-cmd', component: 'Text', text: '`!modal` — Button → modal form', variant: 'body' },
      { id: 'select-cmd', component: 'Text', text: '`!select` — Select menu', variant: 'body' },
      { id: 'cards-cmd', component: 'Text', text: '`!cards` — Multiple embeds', variant: 'body' },
      { id: 'status-cmd', component: 'Text', text: '`!status` — Color-coded status', variant: 'body' },
      { id: 'error-cmd', component: 'Text', text: '`!error` — Error embed', variant: 'body' },
      { id: 'ks-cmd', component: 'Text', text: '`!kitchen-sink` — Everything', variant: 'body' },
      { id: 'raw-cmd', component: 'Text', text: '`!a2ui-raw` — Show raw A2UI JSON', variant: 'body' },
      { id: 'footer', component: 'Text', text: 'Powered by A2UI → Discord renderer', variant: 'caption' },
      { id: 'content', component: 'Column', children: ['title', 'desc', 'embed-cmd', 'buttons-cmd', 'approve-cmd', 'modal-cmd', 'select-cmd', 'cards-cmd', 'status-cmd', 'error-cmd', 'ks-cmd', 'raw-cmd', 'footer'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await msg.reply(a2ui(components, { intent: 'INFORM' }));
  },

  embed: async (msg) => {
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: '📊 Project Status', variant: 'h1' },
      { id: 'desc', component: 'Text', text: "Here's a structured info embed — this is what **A2H INFORM** would render as.", variant: 'body' },
      { id: 'f-project', component: 'Text', text: 'Project: a2discord', variant: 'body' },
      { id: 'f-phase', component: 'Text', text: 'Phase: 1 — MVP', variant: 'body' },
      { id: 'f-status', component: 'Text', text: 'Status: 🟢 On Track', variant: 'body' },
      { id: 'footer', component: 'Text', text: 'A2H Intent: INFORM', variant: 'caption' },
      { id: 'content', component: 'Column', children: ['title', 'desc', 'f-project', 'f-phase', 'f-status', 'footer'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await msg.reply(a2ui(components, { intent: 'INFORM' }));
  },

  buttons: async (msg) => {
    const components: A2UIComponent[] = [
      { id: 'primary-label', component: 'Text', text: 'Primary' },
      { id: 'primary-btn', component: 'Button', child: 'primary-label', variant: 'primary', action: { event: { name: 'primary' } } },
      { id: 'secondary-label', component: 'Text', text: 'Secondary' },
      { id: 'secondary-btn', component: 'Button', child: 'secondary-label', action: { event: { name: 'secondary' } } },
      { id: 'success-label', component: 'Text', text: 'Success' },
      { id: 'success-btn', component: 'Button', child: 'success-label', variant: 'success', action: { event: { name: 'success' } } },
      { id: 'danger-label', component: 'Text', text: 'Danger' },
      { id: 'danger-btn', component: 'Button', child: 'danger-label', variant: 'danger', action: { event: { name: 'danger' } } },
      { id: 'row', component: 'Row', children: ['primary-btn', 'secondary-btn', 'success-btn', 'danger-btn'] },
      { id: 'title', component: 'Text', text: 'Button styles available in Discord:', variant: 'body' },
      { id: 'root', component: 'Column', children: ['title', 'row'] },
    ];
    await msg.reply(a2ui(components));
  },

  approve: async (msg) => {
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: '🔐 Authorization Required', variant: 'h1' },
      { id: 'desc', component: 'Text', text: 'The agent wants to **deploy to production**.\n\nThis will push `v0.2.0` to Cloud Run and update DNS.', variant: 'body' },
      { id: 'f-service', component: 'Text', text: 'Service: `a2discord-prod`', variant: 'body' },
      { id: 'f-region', component: 'Text', text: 'Region: `us-central1`', variant: 'body' },
      { id: 'f-risk', component: 'Text', text: 'Risk: ⚠️ Medium', variant: 'body' },
      { id: 'footer', component: 'Text', text: 'A2H Intent: AUTHORIZE', variant: 'caption' },
      { id: 'content', component: 'Column', children: ['title', 'desc', 'f-service', 'f-region', 'f-risk', 'footer'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await msg.reply(a2ui(components, { intent: 'AUTHORIZE' }));
  },

  modal: async (msg) => {
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: '📝 Input Required', variant: 'h1' },
      { id: 'desc', component: 'Text', text: 'Click the button below to provide project details via a modal form.', variant: 'body' },
      { id: 'name-field', component: 'TextField', label: 'Project Name', textFieldType: 'shortText' },
      { id: 'desc-field', component: 'TextField', label: 'Description', textFieldType: 'longText' },
      { id: 'priority-field', component: 'TextField', label: 'Priority (low/medium/high)', textFieldType: 'shortText' },
      { id: 'footer', component: 'Text', text: 'A2H Intent: COLLECT', variant: 'caption' },
      { id: 'content', component: 'Column', children: ['title', 'desc', 'name-field', 'desc-field', 'priority-field', 'footer'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await msg.reply(a2ui(components, { intent: 'COLLECT' }));
  },

  select: async (msg) => {
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: 'Select deployment target:', variant: 'body' },
      {
        id: 'deploy-select', component: 'ChoicePicker',
        options: [
          { label: 'Development', value: 'dev', description: 'Deploy to dev environment' },
          { label: 'Staging', value: 'staging', description: 'Deploy to staging' },
          { label: 'Production', value: 'prod', description: 'Deploy to production' },
          { label: 'Canary', value: 'canary', description: '5% traffic canary' },
        ],
        maxAllowedSelections: 1,
      },
      { id: 'root', component: 'Column', children: ['title', 'deploy-select'] },
    ];
    await msg.reply(a2ui(components));
  },

  thread: async (msg) => {
    // Thread creation still uses Discord API directly (no A2UI equivalent)
    const thread = await (msg.channel as TextChannel).threads.create({
      name: `📋 Task: ${msg.content.slice(8) || 'Deploy v0.2.0'}`,
      autoArchiveDuration: 60,
    });

    const taskComponents: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: '🎯 Task Created', variant: 'h1' },
      { id: 'desc', component: 'Text', text: 'Thread created for task tracking.', variant: 'body' },
      { id: 'content', component: 'Column', children: ['title', 'desc'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await thread.send(a2ui(taskComponents, { intent: 'INFORM' }));
    await msg.reply(`Thread created: ${thread}`);
  },

  cards: async (msg) => {
    const components: A2UIComponent[] = [
      // Email card
      { id: 'email-title', component: 'Text', text: '📧 Unread Emails (3)', variant: 'h1' },
      { id: 'email-body', component: 'Text', text: 'From: team@google.com — ADK v1.2 release planning\nFrom: github@noreply.com — [a2discord] PR #12 ready\nFrom: calendar@google.com — Reminder: 1:1 in 30 min', variant: 'body' },
      { id: 'email-content', component: 'Column', children: ['email-title', 'email-body'] },
      { id: 'email-card', component: 'Card', child: 'email-content' },
      // Calendar card
      { id: 'cal-title', component: 'Text', text: '📅 Upcoming (next 4h)', variant: 'h1' },
      { id: 'cal-body', component: 'Text', text: '14:00 — 1:1 with PM\n15:30 — Sprint Review\n17:00 — EOD standup', variant: 'body' },
      { id: 'cal-content', component: 'Column', children: ['cal-title', 'cal-body'] },
      { id: 'cal-card', component: 'Card', child: 'cal-content' },
      // Notifications card
      { id: 'notif-title', component: 'Text', text: '🔔 Notifications', variant: 'h1' },
      { id: 'notif-body', component: 'Text', text: '• PR #45 merged to main\n• CI passed on `a2discord@abc1234`\n• 2 new issues assigned', variant: 'body' },
      { id: 'notif-content', component: 'Column', children: ['notif-title', 'notif-body'] },
      { id: 'notif-card', component: 'Card', child: 'notif-content' },
      // Root
      { id: 'root', component: 'Column', children: ['email-card', 'cal-card', 'notif-card'] },
    ];
    await msg.reply(a2ui(components, { intent: 'INFORM' }));
  },

  status: async (msg) => {
    const components: A2UIComponent[] = [
      { id: 't1', component: 'Text', text: '✅ **a2a-relay-dev** — healthy (2ms)', variant: 'h1' },
      { id: 'c1', component: 'Column', children: ['t1'] },
      { id: 'card1', component: 'Card', child: 'c1' },
      { id: 't2', component: 'Text', text: '✅ **openclaw-live-dev** — healthy (45ms)', variant: 'h1' },
      { id: 'c2', component: 'Column', children: ['t2'] },
      { id: 'card2', component: 'Card', child: 'c2' },
      { id: 't3', component: 'Text', text: '❌ **a2discord-prod** — unreachable', variant: 'h1' },
      { id: 'c3', component: 'Column', children: ['t3'] },
      { id: 'card3', component: 'Card', child: 'c3' },
      { id: 'root', component: 'Column', children: ['card1', 'card2', 'card3'] },
    ];
    await msg.reply(a2ui(components));
  },

  error: async (msg) => {
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: '❌ Task Failed', variant: 'h1' },
      { id: 'desc', component: 'Text', text: 'The agent encountered an error while processing your request.', variant: 'body' },
      { id: 'err', component: 'Text', text: '`ConnectionRefusedError: Agent at http://localhost:8080 is not reachable`', variant: 'body' },
      { id: 'footer', component: 'Text', text: 'A2H Intent: RESULT (failure)', variant: 'caption' },
      { id: 'content', component: 'Column', children: ['title', 'desc', 'err', 'footer'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await msg.reply(a2ui(components, { intent: 'RESULT', success: false }));
  },

  code: async (msg) => {
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: '📄 Generated Code', variant: 'h1' },
      { id: 'desc', component: 'Text', text: "Here's the adapter config:\n```yaml\ndiscord:\n  token: ${DISCORD_TOKEN}\n  guild_id: \"1465369831044944118\"\nagents:\n  - name: zaf\n    url: https://a2a-relay-dev.run.app\n```", variant: 'body' },
      { id: 'content', component: 'Column', children: ['title', 'desc'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await msg.reply(a2ui(components, { intent: 'INFORM' }));
  },

  progress: async (msg) => {
    // Progress still uses message edits (inherently imperative, not A2UI)
    const reply = await msg.reply('⏳ Processing...');
    const stages = [
      '⏳ Processing... `[##--------]` 20%',
      '⏳ Processing... `[####------]` 40%',
      '⏳ Processing... `[######----]` 60%',
      '⏳ Processing... `[########--]` 80%',
      '✅ Complete! `[##########]` 100%',
    ];
    for (const stage of stages) {
      await new Promise(r => setTimeout(r, 800));
      await reply.edit(stage);
    }
    await new Promise(r => setTimeout(r, 500));
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: '✅ Task Complete', variant: 'h1' },
      { id: 'desc', component: 'Text', text: 'Streaming with message edits, final result via A2UI.', variant: 'body' },
      { id: 'content', component: 'Column', children: ['title', 'desc'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await reply.edit({ content: '', ...a2ui(components, { intent: 'RESULT', success: true }) });
  },

  'kitchen-sink': async (msg) => {
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: '🍳 Kitchen Sink Demo', variant: 'h1' },
      { id: 'desc', component: 'Text', text: 'Everything a2discord can render in one message.\n\n**Bold**, *italic*, `code`, ~~strikethrough~~, ||spoiler||', variant: 'body' },
      { id: 'thumb', component: 'Image', url: 'https://github.com/zeroasterisk.png', variant: 'thumbnail' },
      { id: 'f1', component: 'Text', text: 'Inline 1: Value', variant: 'body' },
      { id: 'f2', component: 'Text', text: 'Inline 2: Value', variant: 'body' },
      { id: 'code-block', component: 'Text', text: '```ts\nconst x: string = "hello";\n```', variant: 'body' },
      { id: 'hero-img', component: 'Image', url: 'https://opengraph.githubassets.com/1/zeroasterisk/a2discord' },
      { id: 'footer', component: 'Text', text: 'A2H • A2UI • A2A', variant: 'caption' },
      // Buttons
      { id: 'approve-label', component: 'Text', text: '✅ Approve' },
      { id: 'approve-btn', component: 'Button', child: 'approve-label', variant: 'success', action: { event: { name: 'approve' } } },
      { id: 'deny-label', component: 'Text', text: '❌ Deny' },
      { id: 'deny-btn', component: 'Button', child: 'deny-label', variant: 'danger', action: { event: { name: 'deny' } } },
      { id: 'info-label', component: 'Text', text: 'ℹ️ Details' },
      { id: 'info-btn', component: 'Button', child: 'info-label', variant: 'primary', action: { event: { name: 'info' } } },
      { id: 'btn-row', component: 'Row', children: ['approve-btn', 'deny-btn', 'info-btn'] },
      // Select
      {
        id: 'ks-select', component: 'ChoicePicker',
        options: [
          { label: 'Option A', value: 'a' },
          { label: 'Option B', value: 'b' },
          { label: 'Option C', value: 'c' },
        ],
        maxAllowedSelections: 1,
      },
      { id: 'content', component: 'Column', children: ['title', 'desc', 'thumb', 'f1', 'f2', 'code-block', 'hero-img', 'footer', 'btn-row', 'ks-select'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await msg.reply(a2ui(components, { intent: 'INFORM' }));
  },

  'a2ui-raw': async (msg) => {
    // Show raw A2UI JSON alongside rendered output
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: '🔍 A2UI Raw Debug', variant: 'h1' },
      { id: 'desc', component: 'Text', text: 'This shows the A2UI JSON and its Discord rendering side by side.', variant: 'body' },
      { id: 'content', component: 'Column', children: ['title', 'desc'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    const rendered = a2ui(components, { intent: 'INFORM' });

    // Send raw JSON first
    const json = JSON.stringify({ components, metadata: { intent: 'INFORM' } }, null, 2);
    await msg.reply(`**Raw A2UI JSON:**\n\`\`\`json\n${json.slice(0, 1800)}\n\`\`\``);

    // Then send rendered version
    await (msg.channel as TextChannel).send({ content: '**Rendered Discord output:**', ...rendered });
  },
};

// ─── Interaction handlers ───

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    const btn = interaction as ButtonInteraction;
    const id = btn.customId;

    if (id.includes('approve')) {
      const components: A2UIComponent[] = [
        { id: 'title', component: 'Text', text: '✅ Approved', variant: 'h1' },
        { id: 'desc', component: 'Text', text: `Approved by <@${btn.user.id}>`, variant: 'body' },
        { id: 'content', component: 'Column', children: ['title', 'desc'] },
        { id: 'root', component: 'Card', child: 'content' },
      ];
      await btn.update({ ...a2ui(components, { intent: 'RESULT', success: true }), components: [] });
    } else if (id.includes('deny')) {
      const components: A2UIComponent[] = [
        { id: 'title', component: 'Text', text: '❌ Denied', variant: 'h1' },
        { id: 'desc', component: 'Text', text: `Denied by <@${btn.user.id}>`, variant: 'body' },
        { id: 'content', component: 'Column', children: ['title', 'desc'] },
        { id: 'root', component: 'Card', child: 'content' },
      ];
      await btn.update({ ...a2ui(components, { intent: 'RESULT', success: false }), components: [] });
    } else if (id === 'a2ui-collect-respond') {
      const modal = new ModalBuilder()
        .setCustomId('demo-modal-submit')
        .setTitle('📝 Project Details');
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId('project-name').setLabel('Project Name').setStyle(TextInputStyle.Short).setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId('project-desc').setLabel('Description').setStyle(TextInputStyle.Paragraph).setRequired(true),
        ),
      );
      await btn.showModal(modal);
    } else {
      await btn.reply({ content: `You clicked: **${id}**`, flags: ['Ephemeral'] as any });
    }
  }

  if (interaction.isStringSelectMenu()) {
    const select = interaction as StringSelectMenuInteraction;
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: 'Selection Made', variant: 'h1' },
      { id: 'desc', component: 'Text', text: `You selected: **${select.values.join(', ')}**`, variant: 'body' },
      { id: 'content', component: 'Column', children: ['title', 'desc'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await select.update({ ...a2ui(components, { intent: 'RESULT', success: true }), components: [] });
  }

  if (interaction.isModalSubmit()) {
    const modal = interaction as ModalSubmitInteraction;
    if (modal.customId === 'demo-modal-submit') {
      const name = modal.fields.getTextInputValue('project-name');
      const desc = modal.fields.getTextInputValue('project-desc');
      const components: A2UIComponent[] = [
        { id: 'title', component: 'Text', text: '✅ Input Received', variant: 'h1' },
        { id: 'desc', component: 'Text', text: `Project: ${name}\nDescription: ${desc}`, variant: 'body' },
        { id: 'footer', component: 'Text', text: 'A2H Intent: COLLECT → response', variant: 'caption' },
        { id: 'content', component: 'Column', children: ['title', 'desc', 'footer'] },
        { id: 'root', component: 'Card', child: 'content' },
      ];
      await modal.reply(a2ui(components, { intent: 'RESULT', success: true }));
    }
  }
});

// ─── Message handler ───

client.on(Events.MessageCreate, async (msg) => {
  const ALLOWED_BOTS = ['1465366810705526955'];
  if (msg.author.bot && !ALLOWED_BOTS.includes(msg.author.id)) return;
  if (msg.system) return;

  if (CHANNEL_FILTER.length > 0) {
    const channelId = msg.channel.type === ChannelType.PublicThread
      ? msg.channel.parentId ?? msg.channelId
      : msg.channelId;
    if (!CHANNEL_FILTER.includes(channelId) && !CHANNEL_FILTER.includes(msg.channelId)) return;
  }

  const content = msg.content.trim();
  const cmd = content.startsWith('!') ? content.slice(1).split(/\s+/)[0].toLowerCase() : null;

  if (cmd && commands[cmd]) {
    try {
      await commands[cmd](msg);
    } catch (err) {
      console.error(`[demo-bot] Error in !${cmd}:`, err);
      const components: A2UIComponent[] = [
        { id: 'title', component: 'Text', text: '❌ Command Error', variant: 'h1' },
        { id: 'desc', component: 'Text', text: `\`\`\`\n${(err as Error).message}\n\`\`\``, variant: 'body' },
        { id: 'content', component: 'Column', children: ['title', 'desc'] },
        { id: 'root', component: 'Card', child: 'content' },
      ];
      await msg.reply(a2ui(components, { intent: 'RESULT', success: false }));
    }
  }
});

// ─── Startup ───

client.once(Events.ClientReady, (c) => {
  console.log(`[demo-bot] Online as ${c.user.tag} (A2UI-driven)`);
  console.log(`[demo-bot] Guilds: ${c.guilds.cache.map(g => g.name).join(', ')}`);
  console.log(`[demo-bot] Channel filter: ${CHANNEL_FILTER.length ? CHANNEL_FILTER.join(', ') : 'all'}`);
  console.log('[demo-bot] Commands: ' + Object.keys(commands).map(c => `!${c}`).join(', '));
});

client.login(TOKEN);

process.on('SIGINT', () => { client.destroy(); process.exit(0); });
process.on('SIGTERM', () => { client.destroy(); process.exit(0); });
