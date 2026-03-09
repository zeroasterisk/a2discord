/**
 * Live integration test — single bot that sends commands to itself and verifies responses.
 * The bot handles commands from itself (same client sends and receives).
 */
import {
  Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  type TextChannel, type Message,
} from 'discord.js';

const BOT_TOKEN = process.env.DISCORD_TOKEN || process.env.A2DISCORD_BOT_TOKEN;
if (!BOT_TOKEN) { console.error('Set DISCORD_TOKEN or A2DISCORD_BOT_TOKEN'); process.exit(1); }
const CHANNEL_ID = "1479976722085580863";

const BLUE = 0x3498db, GREEN = 0x2ecc71, RED = 0xe74c3c, ORANGE = 0xe67e22;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

let botUserId = '';
let testPhase = false; // true when we're running tests

// === COMMAND HANDLERS ===
const commands: Record<string, (msg: Message) => Promise<void>> = {
  help: async (msg) => {
    const embed = new EmbedBuilder()
      .setTitle('🤖 a2discord Demo Bot')
      .setDescription('Deterministic demo — exercising Discord rendering capabilities.')
      .setColor(BLUE)
      .addFields(
        { name: '`!embed`', value: 'Rich embed with fields', inline: true },
        { name: '`!approve`', value: 'Approve/deny flow', inline: true },
        { name: '`!kitchen-sink`', value: 'Everything', inline: true },
      );
    await msg.reply({ embeds: [embed] });
  },
  embed: async (msg) => {
    const embed = new EmbedBuilder()
      .setTitle('📊 Project Status')
      .setDescription('A2H INFORM intent rendered as embed')
      .setColor(BLUE)
      .addFields(
        { name: 'Project', value: 'a2discord', inline: true },
        { name: 'Status', value: '🟢 On Track', inline: true },
      )
      .setTimestamp();
    await msg.reply({ embeds: [embed] });
  },
  approve: async (msg) => {
    const embed = new EmbedBuilder()
      .setTitle('🔐 Authorization Required')
      .setDescription('Deploy to production?')
      .setColor(ORANGE)
      .addFields({ name: 'Service', value: '`a2discord-prod`', inline: true });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('demo-approve').setLabel('✅ Approve').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('demo-deny').setLabel('❌ Deny').setStyle(ButtonStyle.Danger),
    );
    await msg.reply({ embeds: [embed], components: [row] });
  },
  'kitchen-sink': async (msg) => {
    const embed = new EmbedBuilder()
      .setTitle('🍳 Kitchen Sink')
      .setDescription('**Bold**, *italic*, `code`')
      .setColor(0x9b59b6)
      .addFields({ name: 'Field 1', value: 'Value', inline: true }, { name: 'Field 2', value: 'Value', inline: true })
      .setTimestamp();
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('ks-approve').setLabel('✅ Approve').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ks-deny').setLabel('❌ Deny').setStyle(ButtonStyle.Danger),
    );
    const select = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder().setCustomId('ks-select').setPlaceholder('Pick...').addOptions(
        { label: 'A', value: 'a', emoji: '🅰️' }, { label: 'B', value: 'b', emoji: '🅱️' },
      ),
    );
    await msg.reply({ embeds: [embed], components: [buttons, select] });
  },
};

// Handle commands — including from self
client.on(Events.MessageCreate, async (msg) => {
  if (msg.channelId !== CHANNEL_ID) return;
  const content = msg.content.trim();
  if (!content.startsWith('!')) return;
  const cmd = content.slice(1).split(/\s+/)[0].toLowerCase();
  
  // Only handle commands that are NOT replies (original commands, not bot responses)
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
      const embed = new EmbedBuilder().setTitle('✅ Approved').setDescription(`Approved by <@${interaction.user.id}>`).setColor(GREEN).setTimestamp();
      await interaction.update({ embeds: [embed], components: [] });
    } else if (id.includes('deny')) {
      const embed = new EmbedBuilder().setTitle('❌ Denied').setDescription(`Denied by <@${interaction.user.id}>`).setColor(RED).setTimestamp();
      await interaction.update({ embeds: [embed], components: [] });
    }
  }
  if (interaction.isStringSelectMenu()) {
    const embed = new EmbedBuilder().setTitle('Selected').setDescription(`**${interaction.values.join(', ')}**`).setColor(GREEN);
    await interaction.update({ embeds: [embed], components: [] });
  }
});

// === TEST RUNNER ===
async function runTests(channel: TextChannel) {
  testPhase = true;
  let passed = 0, failed = 0;

  async function testCommand(name: string, cmd: string, check: (msgs: Message[]) => boolean) {
    console.log(`\n[test] === ${name} ===`);
    const sent = await channel.send(cmd);
    console.log(`[test] Sent: ${cmd} (id: ${sent.id})`);
    
    // Wait for reply to appear
    await new Promise(r => setTimeout(r, 3000));
    
    // Fetch recent messages and find the reply
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

  await testCommand('!help → embed', '!help', (msgs) => msgs[0].embeds.length > 0 && msgs[0].embeds[0].title?.includes('Demo Bot') === true);
  await testCommand('!embed → fields', '!embed', (msgs) => msgs[0].embeds.length > 0 && msgs[0].embeds[0].fields.length >= 2);
  await testCommand('!approve → buttons', '!approve', (msgs) => msgs[0].embeds.length > 0 && msgs[0].components.length > 0);
  await testCommand('!kitchen-sink → all', '!kitchen-sink', (msgs) => msgs[0].embeds.length > 0 && msgs[0].components.length >= 2);

  console.log(`\n[test] ════════════════════════`);
  console.log(`[test] Results: ${passed} passed, ${failed} failed`);
  console.log(`[test] ════════════════════════`);

  return { passed, failed };
}

// === STARTUP ===
client.once(Events.ClientReady, async (c) => {
  botUserId = c.user.id;
  console.log(`[bot] Online as ${c.user.tag} (${botUserId})`);

  const channel = await c.channels.fetch(CHANNEL_ID) as TextChannel;
  if (!channel) { console.error('[test] Channel not found'); process.exit(1); }

  // Announce
  await channel.send('🧪 **a2discord live test starting...** Bot will send commands to itself and verify responses.');

  // Run tests
  const { passed, failed } = await runTests(channel);

  // Post summary to Discord
  const summaryEmbed = new EmbedBuilder()
    .setTitle(`🧪 Test Results: ${passed}/${passed + failed} passed`)
    .setColor(failed === 0 ? GREEN : RED)
    .setDescription(failed === 0 ? 'All Discord rendering capabilities verified! ✅' : `${failed} test(s) failed — check logs.`)
    .setTimestamp();
  await channel.send({ embeds: [summaryEmbed] });

  // Stay alive for 30s for Alan to interact with the buttons
  console.log('[test] Bot staying alive 30s for manual interaction...');
  setTimeout(() => { client.destroy(); process.exit(failed > 0 ? 1 : 0); }, 30000);
});

client.login(BOT_TOKEN);
process.on('SIGINT', () => { client.destroy(); process.exit(0); });
