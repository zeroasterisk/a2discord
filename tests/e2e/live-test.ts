/**
 * Live integration test — A2UI v0.9 Discord catalog.
 * Single bot that sends commands to itself and verifies responses.
 */
import {
  Client, GatewayIntentBits, Events,
  ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle,
  type TextChannel, type Message, type ButtonInteraction,
  type StringSelectMenuInteraction, type ModalSubmitInteraction,
  ChannelType,
} from 'discord.js';
import { DiscordCatalogRenderer } from '../../src/rendering/a2ui-renderer';
import type { A2UIMessage, DiscordMessageComponent, DiscordMessageOptions } from '../../src/types';
import { DISCORD_CATALOG_ID } from '../../src/types';

const BOT_TOKEN = process.env.DISCORD_TOKEN || process.env.A2DISCORD_BOT_TOKEN;
if (!BOT_TOKEN) { console.error('Set DISCORD_TOKEN or A2DISCORD_BOT_TOKEN'); process.exit(1); }
const CHANNEL_ID = "1479976722085580863";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const renderer = new DiscordCatalogRenderer();
let botUserId = '';

function createA2UIMessages(surfaceId: string, root: DiscordMessageComponent): A2UIMessage[] {
  return [
    { version: 'v0.9', createSurface: { surfaceId, catalogId: DISCORD_CATALOG_ID } },
    { version: 'v0.9', updateComponents: { surfaceId, components: [root] } },
  ];
}

function renderMsg(surfaceId: string, root: DiscordMessageComponent): DiscordMessageOptions {
  return renderer.renderFirstMessage(createA2UIMessages(surfaceId, root));
}

// === COMMAND HANDLERS ===
const commands: Record<string, (msg: Message) => Promise<void>> = {
  help: async (msg) => {
    await msg.reply(renderMsg('help', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'help-embed', component: 'DiscordEmbed',
        title: '🤖 a2discord Demo Bot',
        description: 'A2UI v0.9 Discord Catalog — all responses use Discord-native components.\n\n`!embed` — Rich embed\n`!approve` — Approve/deny\n`!kitchen-sink` — Everything\n`!a2ui-raw` — Wire format JSON',
        color: '#3498db',
      }],
    }));
  },
  embed: async (msg) => {
    await msg.reply(renderMsg('embed', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'status', component: 'DiscordEmbed',
        title: '📊 Project Status',
        description: 'A2UI v0.9 Discord catalog rendering',
        color: '#3498db',
        fields: [
          { name: 'Project', value: 'a2discord', inline: true },
          { name: 'Status', value: '🟢 On Track', inline: true },
        ],
      }],
    }));
  },
  approve: async (msg) => {
    await msg.reply(renderMsg('approve', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'auth', component: 'DiscordEmbed',
        title: '🔐 Authorization Required',
        description: 'Deploy to production?',
        color: '#e67e22',
        fields: [{ name: 'Service', value: '`a2discord-prod`', inline: true }],
      }],
      components: [{
        id: 'row', component: 'DiscordActionRow',
        children: [
          { id: 'approve-btn', component: 'DiscordButton', label: '✅ Approve', style: 'success', customId: 'a2ui-approve' },
          { id: 'deny-btn', component: 'DiscordButton', label: '❌ Deny', style: 'danger', customId: 'a2ui-deny' },
        ],
      }],
    }));
  },
  'kitchen-sink': async (msg) => {
    await msg.reply(renderMsg('kitchen-sink', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'ks', component: 'DiscordEmbed',
        title: '🍳 Kitchen Sink',
        description: '**Bold**, *italic*, `code`',
        color: '#3498db',
        fields: [
          { name: 'Field 1', value: 'Value', inline: true },
          { name: 'Field 2', value: 'Value', inline: true },
        ],
      }],
      components: [
        {
          id: 'btn-row', component: 'DiscordActionRow',
          children: [
            { id: 'b1', component: 'DiscordButton', label: '✅ Approve', style: 'success', customId: 'a2ui-approve' },
            { id: 'b2', component: 'DiscordButton', label: '❌ Deny', style: 'danger', customId: 'a2ui-deny' },
          ],
        },
        {
          id: 'select-row', component: 'DiscordActionRow',
          children: [{
            id: 'sel', component: 'DiscordSelectMenu',
            customId: 'ks-select',
            options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }],
          }],
        },
      ],
    }));
  },
  'a2ui-raw': async (msg) => {
    const a2ui = createA2UIMessages('raw-demo', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{
        id: 'raw', component: 'DiscordEmbed',
        title: '🔍 A2UI v0.9 Wire Format',
        description: 'Discord catalog components',
        color: '#3498db',
      }],
      components: [{
        id: 'row', component: 'DiscordActionRow',
        children: [
          { id: 'btn', component: 'DiscordButton', label: 'Example', style: 'primary', customId: 'raw-example' },
        ],
      }],
    });
    const json = JSON.stringify(a2ui, null, 2);
    await msg.reply(`**A2UI v0.9 Wire Format:**\n\`\`\`json\n${json.slice(0, 1800)}\n\`\`\``);
    await (msg.channel as TextChannel).send({ content: '**Rendered:**', ...renderer.renderFirstMessage(a2ui) });
  },
};

// Handle commands
client.on(Events.MessageCreate, async (msg) => {
  if (msg.channelId !== CHANNEL_ID) return;
  const content = msg.content.trim();
  if (!content.startsWith('!')) return;
  const cmd = content.slice(1).split(/\s+/)[0].toLowerCase();
  if (msg.reference) return;
  if (commands[cmd]) {
    try { await commands[cmd](msg); } catch (err) { console.error(`[bot] ❌ !${cmd}:`, (err as Error).message); }
  }
});

// Handle interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    const id = interaction.customId;
    if (id.includes('approve')) {
      await interaction.update({ ...renderMsg('approved', {
        id: 'root', component: 'DiscordMessage',
        embeds: [{ id: 'r', component: 'DiscordEmbed', title: '✅ Approved', description: `By <@${interaction.user.id}>`, color: '#2ecc71' }],
      }), components: [] });
    } else if (id.includes('deny')) {
      await interaction.update({ ...renderMsg('denied', {
        id: 'root', component: 'DiscordMessage',
        embeds: [{ id: 'r', component: 'DiscordEmbed', title: '❌ Denied', description: `By <@${interaction.user.id}>`, color: '#e74c3c' }],
      }), components: [] });
    }
  }
  if (interaction.isStringSelectMenu()) {
    await interaction.update({ ...renderMsg('selected', {
      id: 'root', component: 'DiscordMessage',
      embeds: [{ id: 'r', component: 'DiscordEmbed', title: 'Selected', description: `**${interaction.values.join(', ')}**`, color: '#2ecc71' }],
    }), components: [] });
  }
});

// === TEST RUNNER ===
async function runTests(channel: TextChannel) {
  let passed = 0, failed = 0;

  async function testCommand(name: string, cmd: string, check: (msgs: Message[]) => boolean) {
    console.log(`\n[test] === ${name} ===`);
    const sent = await channel.send(cmd);
    await new Promise(r => setTimeout(r, 3000));
    const messages = await channel.messages.fetch({ after: sent.id, limit: 5 });
    const replies = messages.filter(m => m.author.id === botUserId && m.reference?.messageId === sent.id);
    const allReplies = [...replies.values()];
    if (allReplies.length > 0 && check(allReplies)) {
      console.log(`[test] ✅ ${name}`); passed++;
    } else {
      console.log(`[test] ❌ ${name} — ${allReplies.length} replies`);
      if (allReplies.length > 0) {
        const r = allReplies[0];
        console.log(`[test]   content: "${r.content}", embeds: ${r.embeds.length}, components: ${r.components.length}`);
      }
      failed++;
    }
  }

  await testCommand('!help → embed', '!help', (msgs) =>
    msgs[0].embeds.length > 0 && msgs[0].embeds.some(e => e.title?.includes('Demo Bot') === true));

  await testCommand('!embed → embed with fields', '!embed', (msgs) =>
    msgs[0].embeds.length > 0 && msgs[0].embeds.some(e => e.title?.includes('Project Status') === true));

  await testCommand('!approve → buttons', '!approve', (msgs) =>
    msgs[0].embeds.length > 0 && msgs[0].components.length > 0);

  await testCommand('!kitchen-sink → embeds + buttons + select', '!kitchen-sink', (msgs) =>
    msgs[0].embeds.length > 0 && msgs[0].components.length >= 2);

  await testCommand('!a2ui-raw → wire format JSON', '!a2ui-raw', (msgs) =>
    msgs[0].content.includes('v0.9') || msgs[0].content.includes('Wire Format'));

  console.log(`\n[test] ════════════════════════`);
  console.log(`[test] Results: ${passed} passed, ${failed} failed`);
  console.log(`[test] ════════════════════════`);
  return { passed, failed };
}

// === STARTUP ===
client.once(Events.ClientReady, async (c) => {
  botUserId = c.user.id;
  console.log(`[bot] Online as ${c.user.tag} (${botUserId}) — A2UI v0.9 Discord Catalog`);

  const channel = await c.channels.fetch(CHANNEL_ID) as TextChannel;
  if (!channel) { console.error('[test] Channel not found'); process.exit(1); }

  await channel.send('🧪 **a2discord live test** — A2UI v0.9 Discord Catalog');
  const { passed, failed } = await runTests(channel);

  await channel.send(renderer.renderFirstMessage(createA2UIMessages('results', {
    id: 'root', component: 'DiscordMessage',
    embeds: [{
      id: 'result', component: 'DiscordEmbed',
      title: `🧪 Test Results: ${passed}/${passed + failed} passed`,
      description: failed === 0
        ? 'All Discord catalog rendering verified! ✅'
        : `${failed} test(s) failed — check logs.`,
      color: failed === 0 ? '#2ecc71' : '#e74c3c',
    }],
  })));

  console.log('[test] Bot staying alive 30s...');
  setTimeout(() => { client.destroy(); process.exit(failed > 0 ? 1 : 0); }, 30000);
});

client.login(BOT_TOKEN);
process.on('SIGINT', () => { client.destroy(); process.exit(0); });
