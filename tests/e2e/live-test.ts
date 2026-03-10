/**
 * Live integration test — single bot that sends commands to itself and verifies responses.
 * Now A2UI-driven: all responses go through A2UIRenderer.
 */
import {
  Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  type TextChannel, type Message, type ButtonInteraction,
  type StringSelectMenuInteraction, type ModalSubmitInteraction,
  ChannelType,
} from 'discord.js';
import { A2UIRenderer, type A2UIComponent } from '../../src/rendering/a2ui-renderer';

const BOT_TOKEN = process.env.DISCORD_TOKEN || process.env.A2DISCORD_BOT_TOKEN;
if (!BOT_TOKEN) { console.error('Set DISCORD_TOKEN or A2DISCORD_BOT_TOKEN'); process.exit(1); }
const CHANNEL_ID = "1479976722085580863";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const renderer = new A2UIRenderer();
let botUserId = '';

function a2ui(components: A2UIComponent[], metadata?: Record<string, unknown>) {
  return renderer.render(components, metadata);
}

// === COMMAND HANDLERS (A2UI-driven) ===
const commands: Record<string, (msg: Message) => Promise<void>> = {
  help: async (msg) => {
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: '🤖 a2discord Demo Bot', variant: 'h1' },
      { id: 'desc', component: 'Text', text: 'A2UI-driven demo — all responses rendered through A2UIRenderer.', variant: 'body' },
      { id: 'cmds', component: 'Text', text: '`!embed` — Rich embed\n`!approve` — Approve/deny\n`!kitchen-sink` — Everything', variant: 'body' },
      { id: 'content', component: 'Column', children: ['title', 'desc', 'cmds'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await msg.reply(a2ui(components, { intent: 'INFORM' }));
  },
  embed: async (msg) => {
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: '📊 Project Status', variant: 'h1' },
      { id: 'desc', component: 'Text', text: 'A2H INFORM intent rendered as embed', variant: 'body' },
      { id: 'f1', component: 'Text', text: 'Project: a2discord', variant: 'body' },
      { id: 'f2', component: 'Text', text: 'Status: 🟢 On Track', variant: 'body' },
      { id: 'content', component: 'Column', children: ['title', 'desc', 'f1', 'f2'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await msg.reply(a2ui(components, { intent: 'INFORM' }));
  },
  approve: async (msg) => {
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: '🔐 Authorization Required', variant: 'h1' },
      { id: 'desc', component: 'Text', text: 'Deploy to production?', variant: 'body' },
      { id: 'f1', component: 'Text', text: 'Service: `a2discord-prod`', variant: 'body' },
      { id: 'content', component: 'Column', children: ['title', 'desc', 'f1'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await msg.reply(a2ui(components, { intent: 'AUTHORIZE' }));
  },
  'kitchen-sink': async (msg) => {
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: '🍳 Kitchen Sink', variant: 'h1' },
      { id: 'desc', component: 'Text', text: '**Bold**, *italic*, `code`', variant: 'body' },
      { id: 'f1', component: 'Text', text: 'Field 1: Value', variant: 'body' },
      { id: 'f2', component: 'Text', text: 'Field 2: Value', variant: 'body' },
      { id: 'approve-label', component: 'Text', text: '✅ Approve' },
      { id: 'approve-btn', component: 'Button', child: 'approve-label', variant: 'success', action: { event: { name: 'approve' } } },
      { id: 'deny-label', component: 'Text', text: '❌ Deny' },
      { id: 'deny-btn', component: 'Button', child: 'deny-label', variant: 'danger', action: { event: { name: 'deny' } } },
      { id: 'btn-row', component: 'Row', children: ['approve-btn', 'deny-btn'] },
      {
        id: 'ks-select', component: 'ChoicePicker',
        options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }],
        maxAllowedSelections: 1,
      },
      { id: 'content', component: 'Column', children: ['title', 'desc', 'f1', 'f2', 'btn-row', 'ks-select'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await msg.reply(a2ui(components, { intent: 'INFORM' }));
  },
};

// Handle commands — including from self
client.on(Events.MessageCreate, async (msg) => {
  if (msg.channelId !== CHANNEL_ID) return;
  const content = msg.content.trim();
  if (!content.startsWith('!')) return;
  const cmd = content.slice(1).split(/\s+/)[0].toLowerCase();
  if (msg.reference) return;

  if (commands[cmd]) {
    console.log(`[bot] Handling !${cmd} from ${msg.author.username} (${msg.author.id})`);
    try {
      await commands[cmd](msg);
      console.log(`[bot] ✅ Replied to !${cmd}`);
    } catch (err) {
      console.error(`[bot] ❌ Error on !${cmd}:`, (err as Error).message);
    }
  }
});

// Handle button interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    const id = interaction.customId;
    if (id.includes('approve')) {
      const components: A2UIComponent[] = [
        { id: 'title', component: 'Text', text: '✅ Approved', variant: 'h1' },
        { id: 'desc', component: 'Text', text: `Approved by <@${interaction.user.id}>`, variant: 'body' },
        { id: 'content', component: 'Column', children: ['title', 'desc'] },
        { id: 'root', component: 'Card', child: 'content' },
      ];
      await interaction.update({ ...a2ui(components, { intent: 'RESULT', success: true }), components: [] });
    } else if (id.includes('deny')) {
      const components: A2UIComponent[] = [
        { id: 'title', component: 'Text', text: '❌ Denied', variant: 'h1' },
        { id: 'desc', component: 'Text', text: `Denied by <@${interaction.user.id}>`, variant: 'body' },
        { id: 'content', component: 'Column', children: ['title', 'desc'] },
        { id: 'root', component: 'Card', child: 'content' },
      ];
      await interaction.update({ ...a2ui(components, { intent: 'RESULT', success: false }), components: [] });
    }
  }
  if (interaction.isStringSelectMenu()) {
    const components: A2UIComponent[] = [
      { id: 'title', component: 'Text', text: 'Selected', variant: 'h1' },
      { id: 'desc', component: 'Text', text: `**${interaction.values.join(', ')}**`, variant: 'body' },
      { id: 'content', component: 'Column', children: ['title', 'desc'] },
      { id: 'root', component: 'Card', child: 'content' },
    ];
    await interaction.update({ ...a2ui(components, { intent: 'RESULT', success: true }), components: [] });
  }
});

// === TEST RUNNER ===
async function runTests(channel: TextChannel) {
  let passed = 0, failed = 0;

  async function testCommand(name: string, cmd: string, check: (msgs: Message[]) => boolean) {
    console.log(`\n[test] === ${name} ===`);
    const sent = await channel.send(cmd);
    console.log(`[test] Sent: ${cmd} (id: ${sent.id})`);

    await new Promise(r => setTimeout(r, 3000));

    const messages = await channel.messages.fetch({ after: sent.id, limit: 5 });
    const replies = messages.filter(m =>
      m.author.id === botUserId && m.reference?.messageId === sent.id
    );

    const allReplies = [...replies.values()];
    if (allReplies.length > 0 && check(allReplies)) {
      console.log(`[test] ✅ ${name} passed`);
      passed++;
    } else {
      console.log(`[test] ❌ ${name} failed — got ${allReplies.length} replies`);
      if (allReplies.length > 0) {
        const r = allReplies[0];
        console.log(`[test]   content: "${r.content}", embeds: ${r.embeds.length}, components: ${r.components.length}`);
      }
      failed++;
    }
  }

  await testCommand('!help → embed with title', '!help', (msgs) =>
    msgs[0].embeds.length > 0 && msgs[0].embeds.some(e => e.title?.includes('Demo Bot') === true));

  await testCommand('!embed → embed with description', '!embed', (msgs) =>
    msgs[0].embeds.length > 0 && msgs[0].embeds.some(e => e.title?.includes('Project Status') === true));

  await testCommand('!approve → buttons (A2UI AUTHORIZE)', '!approve', (msgs) =>
    msgs[0].embeds.length > 0 && msgs[0].components.length > 0);

  await testCommand('!kitchen-sink → embeds + buttons + select', '!kitchen-sink', (msgs) =>
    msgs[0].embeds.length > 0 && msgs[0].components.length >= 2);

  console.log(`\n[test] ════════════════════════`);
  console.log(`[test] Results: ${passed} passed, ${failed} failed`);
  console.log(`[test] ════════════════════════`);

  return { passed, failed };
}

// === STARTUP ===
client.once(Events.ClientReady, async (c) => {
  botUserId = c.user.id;
  console.log(`[bot] Online as ${c.user.tag} (${botUserId}) — A2UI-driven`);

  const channel = await c.channels.fetch(CHANNEL_ID) as TextChannel;
  if (!channel) { console.error('[test] Channel not found'); process.exit(1); }

  await channel.send('🧪 **a2discord live test starting...** A2UI-driven — all responses rendered through A2UIRenderer.');

  const { passed, failed } = await runTests(channel);

  // Post summary
  const components: A2UIComponent[] = [
    { id: 'title', component: 'Text', text: `🧪 Test Results: ${passed}/${passed + failed} passed`, variant: 'h1' },
    { id: 'desc', component: 'Text', text: failed === 0
      ? 'All A2UI → Discord rendering verified! ✅\nEvery response was generated as A2UI JSON and rendered through A2UIRenderer.'
      : `${failed} test(s) failed — check logs.`, variant: 'body' },
    { id: 'content', component: 'Column', children: ['title', 'desc'] },
    { id: 'root', component: 'Card', child: 'content' },
  ];
  await channel.send(a2ui(components, { intent: failed === 0 ? 'RESULT' : 'RESULT', success: failed === 0 }));

  console.log('[test] Bot staying alive 30s for manual interaction...');
  setTimeout(() => { client.destroy(); process.exit(failed > 0 ? 1 : 0); }, 30000);
});

client.login(BOT_TOKEN);
process.on('SIGINT', () => { client.destroy(); process.exit(0); });
