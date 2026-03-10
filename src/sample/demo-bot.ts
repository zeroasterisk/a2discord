/**
 * demo-bot.ts — Discord catalog A2UI demo bot.
 *
 * All responses are A2UI v0.9 wire format using the Discord catalog,
 * rendered through DiscordCatalogRenderer.
 *
 * Commands (prefix with !):
 *   !help          — list all commands
 *   !embed         — rich embed with fields
 *   !buttons       — action row with buttons
 *   !approve       — authorization flow (approve/deny)
 *   !modal         — button that opens a modal form
 *   !select        — select menu
 *   !cards         — multiple embeds
 *   !status        — color-coded status
 *   !error         — error embed
 *   !code          — code block in embed
 *   !progress      — simulated progress
 *   !kitchen-sink  — everything at once
 *   !a2ui-raw      — dump raw v0.9 wire format JSON
 *
 * Run: DISCORD_TOKEN=... bun run src/sample/demo-bot.ts
 */

import {
  Client,
  GatewayIntentBits,
  Events,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  type Message,
  type TextChannel,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
} from 'discord.js';
import { DiscordCatalogRenderer } from '../rendering/a2ui-renderer.js';
import type {
  A2UIMessage,
  DiscordMessageOptions,
  DiscordMessageComponent,
  DiscordEmbedComponent,
  DiscordActionRowComponent,
  DiscordButtonComponent,
  DiscordSelectMenuComponent,
  DiscordModalComponent,
  DiscordTextInputComponent,
} from '../types.js';
import { DISCORD_CATALOG_ID } from '../types.js';

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

const renderer = new DiscordCatalogRenderer();

// ─── Helper to build v0.9 messages ───

function createA2UIMessages(surfaceId: string, rootComponent: DiscordMessageComponent): A2UIMessage[] {
  return [
    {
      version: 'v0.9',
      createSurface: { surfaceId, catalogId: DISCORD_CATALOG_ID },
    },
    {
      version: 'v0.9',
      updateComponents: { surfaceId, components: [rootComponent] },
    },
  ];
}

function renderMessages(msgs: A2UIMessage[]): DiscordMessageOptions {
  return renderer.renderFirstMessage(msgs);
}

// ─── Command handlers ───

const commands: Record<string, (msg: Message) => Promise<void>> = {
  help: async (msg) => {
    const a2ui = createA2UIMessages('help', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'help-embed', component: 'DiscordEmbed',
        title: '🤖 a2discord Demo Bot',
        description: 'A2UI v0.9 Discord catalog — all responses use Discord-native components.\n\n' +
          '`!embed` — Rich embed with fields\n' +
          '`!buttons` — Action row with buttons\n' +
          '`!approve` — Approve/deny flow\n' +
          '`!modal` — Button → modal form\n' +
          '`!select` — Select menu\n' +
          '`!cards` — Multiple embeds\n' +
          '`!status` — Color-coded status\n' +
          '`!error` — Error embed\n' +
          '`!code` — Code block\n' +
          '`!kitchen-sink` — Everything\n' +
          '`!a2ui-raw` — Show raw v0.9 JSON',
        color: '#3498db',
        footer: 'Powered by A2UI v0.9 Discord Catalog',
      }],
    });
    await msg.reply(renderMessages(a2ui));
  },

  embed: async (msg) => {
    const a2ui = createA2UIMessages('embed-demo', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'status-embed', component: 'DiscordEmbed',
        title: '📊 Project Status',
        description: "Here's a structured info embed — this is what an agent would compose using the Discord catalog.",
        color: '#3498db',
        fields: [
          { name: 'Project', value: 'a2discord', inline: true },
          { name: 'Phase', value: '1 — MVP', inline: true },
          { name: 'Status', value: '🟢 On Track', inline: true },
        ],
        footer: 'Discord Catalog • DiscordEmbed',
      }],
    });
    await msg.reply(renderMessages(a2ui));
  },

  buttons: async (msg) => {
    const a2ui = createA2UIMessages('buttons-demo', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'btn-embed', component: 'DiscordEmbed',
        title: '🔘 Button Styles',
        description: 'All Discord button styles available in the catalog:',
        color: '#3498db',
      }],
      components: [{
        id: 'btn-row', component: 'DiscordActionRow',
        children: [
          { id: 'primary-btn', component: 'DiscordButton', label: 'Primary', style: 'primary', customId: 'demo-primary' },
          { id: 'secondary-btn', component: 'DiscordButton', label: 'Secondary', style: 'secondary', customId: 'demo-secondary' },
          { id: 'success-btn', component: 'DiscordButton', label: 'Success', style: 'success', customId: 'demo-success' },
          { id: 'danger-btn', component: 'DiscordButton', label: 'Danger', style: 'danger', customId: 'demo-danger' },
        ],
      }],
    });
    await msg.reply(renderMessages(a2ui));
  },

  approve: async (msg) => {
    const a2ui = createA2UIMessages('approve-demo', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'auth-embed', component: 'DiscordEmbed',
        title: '🔐 Authorization Required',
        description: 'The agent wants to **deploy to production**.\n\nThis will push `v0.2.0` to Cloud Run and update DNS.',
        color: '#e67e22',
        fields: [
          { name: 'Service', value: '`a2discord-prod`', inline: true },
          { name: 'Region', value: '`us-central1`', inline: true },
          { name: 'Risk', value: '⚠️ Medium', inline: true },
        ],
        footer: 'Discord Catalog • AUTHORIZE intent',
      }],
      components: [{
        id: 'auth-row', component: 'DiscordActionRow',
        children: [
          { id: 'approve-btn', component: 'DiscordButton', label: '✅ Approve', style: 'success', customId: 'a2ui-approve' },
          { id: 'deny-btn', component: 'DiscordButton', label: '❌ Deny', style: 'danger', customId: 'a2ui-deny' },
        ],
      }],
    });
    await msg.reply(renderMessages(a2ui));
  },

  modal: async (msg) => {
    const a2ui = createA2UIMessages('modal-demo', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'modal-embed', component: 'DiscordEmbed',
        title: '📝 Input Required',
        description: 'Click the button below to provide project details via a modal form.',
        color: '#e67e22',
        footer: 'Discord Catalog • COLLECT intent',
      }],
      components: [{
        id: 'modal-row', component: 'DiscordActionRow',
        children: [
          { id: 'open-modal-btn', component: 'DiscordButton', label: '📝 Provide Info', style: 'primary', customId: 'a2ui-collect-respond' },
        ],
      }],
    });
    await msg.reply(renderMessages(a2ui));
  },

  select: async (msg) => {
    const a2ui = createA2UIMessages('select-demo', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'select-embed', component: 'DiscordEmbed',
        title: '🎯 Deployment Target',
        description: 'Select where to deploy:',
        color: '#3498db',
      }],
      components: [{
        id: 'select-row', component: 'DiscordActionRow',
        children: [{
          id: 'deploy-select', component: 'DiscordSelectMenu',
          customId: 'deploy-target',
          placeholder: 'Choose deployment target...',
          options: [
            { label: 'Development', value: 'dev', description: 'Deploy to dev environment' },
            { label: 'Staging', value: 'staging', description: 'Deploy to staging' },
            { label: 'Production', value: 'prod', description: 'Deploy to production' },
            { label: 'Canary', value: 'canary', description: '5% traffic canary' },
          ],
        }],
      }],
    });
    await msg.reply(renderMessages(a2ui));
  },

  thread: async (msg) => {
    const thread = await (msg.channel as TextChannel).threads.create({
      name: `📋 Task: ${msg.content.slice(8) || 'Deploy v0.2.0'}`,
      autoArchiveDuration: 60,
    });
    const a2ui = createA2UIMessages('thread-task', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'thread-embed', component: 'DiscordEmbed',
        title: '🎯 Task Created',
        description: 'Thread created for task tracking.',
        color: '#2ecc71',
      }],
    });
    await thread.send(renderMessages(a2ui));
    await msg.reply(`Thread created: ${thread}`);
  },

  cards: async (msg) => {
    const a2ui = createA2UIMessages('cards-demo', {
      id: 'root', component: 'DiscordMessage',
      embeds: [
        {
          id: 'email-embed', component: 'DiscordEmbed',
          title: '📧 Unread Emails (3)',
          description: 'From: team@google.com — ADK v1.2 release planning\nFrom: github@noreply.com — [a2discord] PR #12 ready\nFrom: calendar@google.com — Reminder: 1:1 in 30 min',
          color: '#3498db',
        },
        {
          id: 'cal-embed', component: 'DiscordEmbed',
          title: '📅 Upcoming (next 4h)',
          description: '14:00 — 1:1 with PM\n15:30 — Sprint Review\n17:00 — EOD standup',
          color: '#2ecc71',
        },
        {
          id: 'notif-embed', component: 'DiscordEmbed',
          title: '🔔 Notifications',
          description: '• PR #45 merged to main\n• CI passed on `a2discord@abc1234`\n• 2 new issues assigned',
          color: '#9b59b6',
        },
      ],
    });
    await msg.reply(renderMessages(a2ui));
  },

  status: async (msg) => {
    const a2ui = createA2UIMessages('status-demo', {
      id: 'root', component: 'DiscordMessage',
      embeds: [
        { id: 's1', component: 'DiscordEmbed', title: '✅ a2a-relay-dev', description: 'healthy (2ms)', color: '#2ecc71' },
        { id: 's2', component: 'DiscordEmbed', title: '✅ openclaw-live-dev', description: 'healthy (45ms)', color: '#2ecc71' },
        { id: 's3', component: 'DiscordEmbed', title: '❌ a2discord-prod', description: 'unreachable', color: '#e74c3c' },
      ],
    });
    await msg.reply(renderMessages(a2ui));
  },

  error: async (msg) => {
    const a2ui = createA2UIMessages('error-demo', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'error-embed', component: 'DiscordEmbed',
        title: '❌ Task Failed',
        description: 'The agent encountered an error while processing your request.\n\n`ConnectionRefusedError: Agent at http://localhost:8080 is not reachable`',
        color: '#e74c3c',
        footer: 'Discord Catalog • RESULT (failure)',
        timestamp: true,
      }],
    });
    await msg.reply(renderMessages(a2ui));
  },

  code: async (msg) => {
    const a2ui = createA2UIMessages('code-demo', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'code-embed', component: 'DiscordEmbed',
        title: '📄 Generated Code',
        description: "Here's the adapter config:\n```yaml\ndiscord:\n  token: ${DISCORD_TOKEN}\n  guild_id: \"1465369831044944118\"\nagents:\n  - name: zaf\n    url: https://a2a-relay-dev.run.app\n```",
        color: '#3498db',
      }],
    });
    await msg.reply(renderMessages(a2ui));
  },

  progress: async (msg) => {
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
    const a2ui = createA2UIMessages('progress-done', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'done-embed', component: 'DiscordEmbed',
        title: '✅ Task Complete',
        description: 'Streaming with message edits, final result via A2UI v0.9.',
        color: '#2ecc71',
        timestamp: true,
      }],
    });
    await reply.edit({ content: '', ...renderMessages(a2ui) });
  },

  'kitchen-sink': async (msg) => {
    const a2ui = createA2UIMessages('kitchen-sink', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'ks-embed', component: 'DiscordEmbed',
        title: '🍳 Kitchen Sink Demo',
        description: 'Everything a2discord can render in one message.\n\n**Bold**, *italic*, `code`, ~~strikethrough~~, ||spoiler||',
        color: '#3498db',
        fields: [
          { name: 'Inline 1', value: 'Value A', inline: true },
          { name: 'Inline 2', value: 'Value B', inline: true },
          { name: 'Code Block', value: '```ts\nconst x: string = "hello";\n```', inline: false },
        ],
        thumbnail: 'https://github.com/zeroasterisk.png',
        image: 'https://opengraph.githubassets.com/1/zeroasterisk/a2discord',
        footer: 'A2UI v0.9 • Discord Catalog',
      }],
      components: [
        {
          id: 'ks-btn-row', component: 'DiscordActionRow',
          children: [
            { id: 'ks-approve', component: 'DiscordButton', label: '✅ Approve', style: 'success', customId: 'a2ui-approve' },
            { id: 'ks-deny', component: 'DiscordButton', label: '❌ Deny', style: 'danger', customId: 'a2ui-deny' },
            { id: 'ks-info', component: 'DiscordButton', label: 'ℹ️ Details', style: 'primary', customId: 'demo-info' },
          ],
        },
        {
          id: 'ks-select-row', component: 'DiscordActionRow',
          children: [{
            id: 'ks-select', component: 'DiscordSelectMenu',
            customId: 'ks-select-menu',
            placeholder: 'Select an option...',
            options: [
              { label: 'Option A', value: 'a' },
              { label: 'Option B', value: 'b' },
              { label: 'Option C', value: 'c' },
            ],
          }],
        },
      ],
    });
    await msg.reply(renderMessages(a2ui));
  },

  'a2ui-raw': async (msg) => {
    const a2ui = createA2UIMessages('raw-demo', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'raw-embed', component: 'DiscordEmbed',
        title: '🔍 A2UI Raw Debug',
        description: 'This shows the A2UI v0.9 wire format and its Discord rendering.',
        color: '#3498db',
      }],
      components: [{
        id: 'raw-row', component: 'DiscordActionRow',
        children: [
          { id: 'raw-btn', component: 'DiscordButton', label: '🔘 Example Button', style: 'primary', customId: 'raw-example' },
        ],
      }],
    });

    // Send raw JSON first
    const json = JSON.stringify(a2ui, null, 2);
    await msg.reply(`**Raw A2UI v0.9 Wire Format:**\n\`\`\`json\n${json.slice(0, 1800)}\n\`\`\``);

    // Then send rendered version
    await (msg.channel as TextChannel).send({ content: '**Rendered Discord output:**', ...renderMessages(a2ui) });
  },
};

// ─── Interaction handlers ───

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    const btn = interaction as ButtonInteraction;
    const id = btn.customId;

    if (id.includes('approve')) {
      const a2ui = createA2UIMessages('approved', {
        id: 'root', component: 'DiscordMessage',
        embeds: [{
          id: 'result', component: 'DiscordEmbed',
          title: '✅ Approved',
          description: `Approved by <@${btn.user.id}>`,
          color: '#2ecc71',
          timestamp: true,
        }],
      });
      await btn.update({ ...renderMessages(a2ui), components: [] });
    } else if (id.includes('deny')) {
      const a2ui = createA2UIMessages('denied', {
        id: 'root', component: 'DiscordMessage',
        embeds: [{
          id: 'result', component: 'DiscordEmbed',
          title: '❌ Denied',
          description: `Denied by <@${btn.user.id}>`,
          color: '#e74c3c',
          timestamp: true,
        }],
      });
      await btn.update({ ...renderMessages(a2ui), components: [] });
    } else if (id === 'a2ui-collect-respond') {
      // Build modal from A2UI v0.9 DiscordModal component
      const modalMessages: A2UIMessage[] = [
        { version: 'v0.9', createSurface: { surfaceId: 'collect-modal', catalogId: DISCORD_CATALOG_ID } },
        {
          version: 'v0.9',
          updateComponents: {
            surfaceId: 'collect-modal',
            components: [{
              id: 'modal-root', component: 'DiscordModal',
              title: '📝 Project Details',
              customId: 'demo-modal-submit',
              fields: [
                { id: 'field-name', component: 'DiscordTextInput', customId: 'project-name', label: 'Project Name', style: 'short', required: true },
                { id: 'field-desc', component: 'DiscordTextInput', customId: 'project-desc', label: 'Description', style: 'paragraph', required: true },
                { id: 'field-priority', component: 'DiscordTextInput', customId: 'project-priority', label: 'Priority (low/medium/high)', style: 'short' },
              ],
            }],
          },
        },
      ];
      const result = renderer.render(modalMessages);
      if (result.modals.length > 0) {
        await btn.showModal(result.modals[0] as any);
      }
    } else {
      await btn.reply({ content: `You clicked: **${id}**`, flags: ['Ephemeral'] as any });
    }
  }

  if (interaction.isStringSelectMenu()) {
    const select = interaction as StringSelectMenuInteraction;
    const a2ui = createA2UIMessages('selected', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'result', component: 'DiscordEmbed',
        title: 'Selection Made',
        description: `You selected: **${select.values.join(', ')}**`,
        color: '#2ecc71',
      }],
    });
    await select.update({ ...renderMessages(a2ui), components: [] });
  }

  if (interaction.isModalSubmit()) {
    const modal = interaction as ModalSubmitInteraction;
    if (modal.customId === 'demo-modal-submit') {
      const name = modal.fields.getTextInputValue('project-name');
      const desc = modal.fields.getTextInputValue('project-desc');
      const a2ui = createA2UIMessages('modal-result', {
        id: 'root', component: 'DiscordMessage',
        embeds: [{
          id: 'result', component: 'DiscordEmbed',
          title: '✅ Input Received',
          description: `**Project:** ${name}\n**Description:** ${desc}`,
          color: '#2ecc71',
          footer: 'Discord Catalog • COLLECT → response',
        }],
      });
      await modal.reply(renderMessages(a2ui));
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
      const a2ui = createA2UIMessages('error', {
        id: 'root', component: 'DiscordMessage',
        embeds: [{
          id: 'err', component: 'DiscordEmbed',
          title: '❌ Command Error',
          description: `\`\`\`\n${(err as Error).message}\n\`\`\``,
          color: '#e74c3c',
        }],
      });
      await msg.reply(renderMessages(a2ui));
    }
  }
});

// ─── Startup ───

client.once(Events.ClientReady, (c) => {
  console.log(`[demo-bot] Online as ${c.user.tag} (A2UI v0.9 Discord Catalog)`);
  console.log(`[demo-bot] Guilds: ${c.guilds.cache.map(g => g.name).join(', ')}`);
  console.log(`[demo-bot] Channel filter: ${CHANNEL_FILTER.length ? CHANNEL_FILTER.join(', ') : 'all'}`);
  console.log('[demo-bot] Commands: ' + Object.keys(commands).map(c => `!${c}`).join(', '));
});

client.login(TOKEN);

process.on('SIGINT', () => { client.destroy(); process.exit(0); });
process.on('SIGTERM', () => { client.destroy(); process.exit(0); });
