import {
  Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, type TextChannel, type ButtonInteraction,
} from 'discord.js';

const BOT_TOKEN = process.env.DISCORD_TOKEN || process.env.A2DISCORD_BOT_TOKEN;
if (!BOT_TOKEN) { console.error('Set DISCORD_TOKEN'); process.exit(1); }
const CHANNEL_ID = '1479976722085580863';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Track state
let questionMsg: any = null;

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  const btn = interaction as ButtonInteraction;
  
  if (btn.customId === 'answer-true') {
    const embed = new EmbedBuilder()
      .setTitle('✅ Correct!')
      .setDescription('Yes — `catalogId` is a **required** field in `createSurface`. The v0.9 JSON Schema marks it as required, and the agent must specify which catalog the surface uses.')
      .setColor(0x2ecc71)
      .setTimestamp();
    await btn.update({ embeds: [embed], components: [] });
  } else if (btn.customId === 'answer-false') {
    const embed = new EmbedBuilder()
      .setTitle('❌ Incorrect')
      .setDescription('Actually, `catalogId` IS required in `createSurface`. The v0.9 schema has it in the `required` array — without it, the renderer doesn\'t know which components to expect.')
      .setColor(0xe74c3c)
      .setTimestamp();
    await btn.update({ embeds: [embed], components: [] });
  }
});

client.once(Events.ClientReady, async (c) => {
  console.log(`[quiz] Online as ${c.user.tag}`);
  const channel = await c.channels.fetch(CHANNEL_ID) as TextChannel;

  const embed = new EmbedBuilder()
    .setTitle('🧠 True or False?')
    .setDescription('In A2UI v0.9, `catalogId` is a **required** field in `createSurface` messages.')
    .setColor(0x3498db)
    .setFooter({ text: 'A2UI Quiz • Discord Catalog Demo' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('answer-true').setLabel('✅ True').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('answer-false').setLabel('❌ False').setStyle(ButtonStyle.Danger),
  );

  questionMsg = await channel.send({ embeds: [embed], components: [row] });
  console.log('[quiz] Question posted. Waiting for answer...');

  // Stay alive 60s for interaction
  setTimeout(() => { console.log('[quiz] Done.'); client.destroy(); process.exit(0); }, 300000);
});

client.login(BOT_TOKEN);
process.on('SIGINT', () => { client.destroy(); process.exit(0); });
