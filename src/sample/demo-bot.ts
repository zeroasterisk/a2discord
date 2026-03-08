/**
 * demo-bot.ts — Deterministic demo bot for exercising Discord capabilities.
 *
 * No A2A, no external agent. Hardcoded responses that showcase every Discord
 * rendering pattern we want a2discord to support. Use this to discover what
 * works, what doesn't, and what the UX feels like.
 *
 * Commands (prefix with ! or just type in the bot's channel):
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
 *   !components2   — Discord Components V2 (if available)
 *   !kitchen-sink  — everything at once
 *
 * Run: DISCORD_TOKEN=... bun run src/sample/demo-bot.ts
 * TODO: Wire to A2A agent or OpenClaw when Discord capabilities are stable
 */

import {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  type Message,
  type TextChannel,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  ComponentType,
} from 'discord.js';

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

// ─── Colors ───
const BLUE = 0x3498db;
const GREEN = 0x2ecc71;
const RED = 0xe74c3c;
const ORANGE = 0xe67e22;
const PURPLE = 0x9b59b6;
const GOLD = 0xf1c40f;

// ─── Command handlers ───

const commands: Record<string, (msg: Message) => Promise<void>> = {
  help: async (msg) => {
    const embed = new EmbedBuilder()
      .setTitle('🤖 a2discord Demo Bot')
      .setDescription('Deterministic demo — exercising Discord rendering capabilities.\nAll responses are hardcoded. No AI, no A2A agent.')
      .setColor(BLUE)
      .addFields(
        { name: '`!embed`', value: 'Rich embed with fields', inline: true },
        { name: '`!buttons`', value: 'Action row with buttons', inline: true },
        { name: '`!approve`', value: 'Approve/deny flow', inline: true },
        { name: '`!modal`', value: 'Button → modal form', inline: true },
        { name: '`!select`', value: 'Select menu', inline: true },
        { name: '`!thread`', value: 'Thread with content', inline: true },
        { name: '`!cards`', value: 'Multiple embeds', inline: true },
        { name: '`!status`', value: 'Color-coded status', inline: true },
        { name: '`!error`', value: 'Error embed', inline: true },
        { name: '`!code`', value: 'Code block', inline: true },
        { name: '`!progress`', value: 'Animated progress', inline: true },
        { name: '`!kitchen-sink`', value: 'Everything', inline: true },
      )
      .setFooter({ text: 'TODO: Wire to A2A agent when Discord capabilities are stable' });
    await msg.reply({ embeds: [embed] });
  },

  embed: async (msg) => {
    const embed = new EmbedBuilder()
      .setTitle('📊 Project Status')
      .setDescription('Here\'s a structured info embed — this is what **A2H INFORM** would render as.')
      .setColor(BLUE)
      .addFields(
        { name: 'Project', value: 'a2discord', inline: true },
        { name: 'Phase', value: '1 — MVP', inline: true },
        { name: 'Status', value: '🟢 On Track', inline: true },
        { name: 'Tasks Complete', value: '7/15', inline: true },
        { name: 'Test Coverage', value: '24 passing, 79 todo', inline: true },
        { name: 'Next Milestone', value: 'Live bot in Discord', inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'A2H Intent: INFORM' });
    await msg.reply({ embeds: [embed] });
  },

  buttons: async (msg) => {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('demo-primary').setLabel('Primary').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('demo-secondary').setLabel('Secondary').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('demo-success').setLabel('Success').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('demo-danger').setLabel('Danger').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setLabel('Link').setStyle(ButtonStyle.Link).setURL('https://github.com/zeroasterisk/a2discord'),
    );
    await msg.reply({ content: '**Button styles available in Discord:**', components: [row] });
  },

  approve: async (msg) => {
    const embed = new EmbedBuilder()
      .setTitle('🔐 Authorization Required')
      .setDescription('The agent wants to **deploy to production**.\n\nThis will push `v0.2.0` to Cloud Run and update DNS.')
      .setColor(ORANGE)
      .addFields(
        { name: 'Service', value: '`a2discord-prod`', inline: true },
        { name: 'Region', value: '`us-central1`', inline: true },
        { name: 'Risk', value: '⚠️ Medium', inline: true },
      )
      .setFooter({ text: 'A2H Intent: AUTHORIZE' });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('demo-approve').setLabel('✅ Approve').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('demo-deny').setLabel('❌ Deny').setStyle(ButtonStyle.Danger),
    );

    await msg.reply({ embeds: [embed], components: [row] });
  },

  modal: async (msg) => {
    const embed = new EmbedBuilder()
      .setTitle('📝 Input Required')
      .setDescription('Click the button below to provide project details via a modal form.')
      .setColor(ORANGE)
      .addFields(
        { name: 'Project Name', value: '*(required)*', inline: true },
        { name: 'Description', value: '*(required)*', inline: true },
        { name: 'Priority', value: '*(optional)*', inline: true },
      )
      .setFooter({ text: 'A2H Intent: COLLECT' });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('demo-open-modal').setLabel('📝 Provide Info').setStyle(ButtonStyle.Primary),
    );

    await msg.reply({ embeds: [embed], components: [row] });
  },

  select: async (msg) => {
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('demo-select')
        .setPlaceholder('Choose a deployment target...')
        .addOptions(
          { label: 'Development', value: 'dev', description: 'Deploy to dev environment', emoji: '🔧' },
          { label: 'Staging', value: 'staging', description: 'Deploy to staging', emoji: '🧪' },
          { label: 'Production', value: 'prod', description: 'Deploy to production', emoji: '🚀' },
          { label: 'Canary', value: 'canary', description: '5% traffic canary', emoji: '🐤' },
        ),
    );

    await msg.reply({ content: '**Select deployment target:**', components: [row] });
  },

  thread: async (msg) => {
    const thread = await (msg.channel as TextChannel).threads.create({
      name: `📋 Task: ${msg.content.slice(8) || 'Deploy v0.2.0'}`,
      autoArchiveDuration: 60,
    });

    const embed1 = new EmbedBuilder()
      .setTitle('🎯 Task Created')
      .setDescription('Thread created for task tracking. Each A2A task gets its own thread.')
      .setColor(BLUE)
      .addFields(
        { name: 'Task ID', value: '`task-abc123`', inline: true },
        { name: 'State', value: '🔄 Working', inline: true },
      );

    await thread.send({ embeds: [embed1] });

    // Simulate work progress
    setTimeout(async () => {
      const embed2 = new EmbedBuilder()
        .setTitle('📦 Building...')
        .setDescription('```\n$ bun run build\n✓ Compiled 12 modules\n✓ Type checking passed\n```')
        .setColor(GOLD);
      await thread.send({ embeds: [embed2] });
    }, 1500);

    setTimeout(async () => {
      const embed3 = new EmbedBuilder()
        .setTitle('✅ Task Complete')
        .setDescription('Build succeeded. Ready for deployment.')
        .setColor(GREEN)
        .setTimestamp();
      await thread.send({ embeds: [embed3] });
    }, 3000);

    await msg.reply(`Thread created: ${thread}`);
  },

  cards: async (msg) => {
    const embeds = [
      new EmbedBuilder()
        .setTitle('📧 Unread Emails (3)')
        .setColor(BLUE)
        .addFields(
          { name: 'From: team@google.com', value: 'ADK v1.2 release planning — action needed', inline: false },
          { name: 'From: github@noreply.com', value: '[a2discord] PR #12 ready for review', inline: false },
          { name: 'From: calendar@google.com', value: 'Reminder: 1:1 with PM in 30 min', inline: false },
        ),
      new EmbedBuilder()
        .setTitle('📅 Upcoming (next 4h)')
        .setColor(GREEN)
        .addFields(
          { name: '14:00', value: '1:1 with PM', inline: true },
          { name: '15:30', value: 'Sprint Review', inline: true },
          { name: '17:00', value: 'EOD standup', inline: true },
        ),
      new EmbedBuilder()
        .setTitle('🔔 Notifications')
        .setColor(PURPLE)
        .setDescription('• PR #45 merged to main\n• CI passed on `a2discord@abc1234`\n• 2 new issues assigned'),
    ];
    await msg.reply({ content: '**Dashboard — here\'s your briefing:**', embeds });
  },

  status: async (msg) => {
    const embeds = [
      new EmbedBuilder().setColor(GREEN).setDescription('✅ **a2a-relay-dev** — healthy (2ms)'),
      new EmbedBuilder().setColor(GREEN).setDescription('✅ **openclaw-live-dev** — healthy (45ms)'),
      new EmbedBuilder().setColor(RED).setDescription('❌ **a2discord-prod** — unreachable'),
      new EmbedBuilder().setColor(GOLD).setDescription('⚠️ **staging DB** — high latency (2.3s)'),
    ];
    await msg.reply({ content: '**Service Status:**', embeds });
  },

  error: async (msg) => {
    const embed = new EmbedBuilder()
      .setTitle('❌ Task Failed')
      .setDescription('The agent encountered an error while processing your request.')
      .setColor(RED)
      .addFields(
        { name: 'Error', value: '`ConnectionRefusedError: Agent at http://localhost:8080 is not reachable`', inline: false },
        { name: 'Task ID', value: '`task-xyz789`', inline: true },
        { name: 'Duration', value: '3.2s', inline: true },
        { name: 'Suggestion', value: 'Check that the agent is running and accessible.', inline: false },
      )
      .setTimestamp()
      .setFooter({ text: 'A2H Intent: RESULT (failure)' });
    await msg.reply({ embeds: [embed] });
  },

  code: async (msg) => {
    const embed = new EmbedBuilder()
      .setTitle('📄 Generated Code')
      .setColor(PURPLE)
      .setDescription('Here\'s the adapter config the agent generated:')
      .addFields({
        name: 'a2discord.yaml',
        value: '```yaml\ndiscord:\n  token: ${DISCORD_TOKEN}\n  guild_id: "1465369831044944118"\n\nagents:\n  - name: zaf\n    url: https://a2a-relay-dev.run.app\n    channels: ["a2discord"]\n    streaming: buffer\n\nadapter:\n  thread_per_task: true\n  edit_rate_limit: 5\n  authorize_timeout: 300\n```',
        inline: false,
      });
    await msg.reply({ embeds: [embed] });
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

    for (let i = 0; i < stages.length; i++) {
      await new Promise(r => setTimeout(r, 800));
      await reply.edit(stages[i]);
    }

    // Replace with final embed
    await new Promise(r => setTimeout(r, 500));
    const embed = new EmbedBuilder()
      .setTitle('✅ Task Complete')
      .setDescription('This is what **streaming** looks like — message edits with a final embed result.')
      .setColor(GREEN)
      .setTimestamp();
    await reply.edit({ content: '', embeds: [embed] });
  },

  'kitchen-sink': async (msg) => {
    // Embed
    const embed = new EmbedBuilder()
      .setTitle('🍳 Kitchen Sink Demo')
      .setDescription('Everything a2discord can render in one message.\n\n**Bold**, *italic*, `code`, ~~strikethrough~~, ||spoiler||')
      .setColor(PURPLE)
      .setThumbnail('https://github.com/zeroasterisk.png')
      .addFields(
        { name: 'Inline 1', value: 'Value', inline: true },
        { name: 'Inline 2', value: 'Value', inline: true },
        { name: 'Inline 3', value: 'Value', inline: true },
        { name: 'Full Width', value: 'This field takes the full width of the embed.', inline: false },
        { name: 'Code', value: '```ts\nconst x: string = "hello";\n```', inline: false },
      )
      .setImage('https://opengraph.githubassets.com/1/zeroasterisk/a2discord')
      .setFooter({ text: 'A2H • A2UI • A2A' })
      .setTimestamp();

    // Buttons
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('ks-approve').setLabel('✅ Approve').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ks-deny').setLabel('❌ Deny').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ks-info').setLabel('ℹ️ Details').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setLabel('GitHub').setStyle(ButtonStyle.Link).setURL('https://github.com/zeroasterisk/a2discord'),
    );

    // Select
    const select = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ks-select')
        .setPlaceholder('Pick an option...')
        .addOptions(
          { label: 'Option A', value: 'a', emoji: '🅰️' },
          { label: 'Option B', value: 'b', emoji: '🅱️' },
          { label: 'Option C', value: 'c', emoji: '©️' },
        ),
    );

    await msg.reply({ embeds: [embed], components: [buttons, select] });
  },
};

// ─── Interaction handlers ───

client.on(Events.InteractionCreate, async (interaction) => {
  // Button clicks
  if (interaction.isButton()) {
    const btn = interaction as ButtonInteraction;
    const id = btn.customId;

    if (id === 'demo-approve' || id === 'ks-approve') {
      const embed = new EmbedBuilder()
        .setTitle('✅ Approved')
        .setDescription(`Approved by <@${btn.user.id}>`)
        .setColor(GREEN)
        .setTimestamp();
      await btn.update({ embeds: [embed], components: [] });
    } else if (id === 'demo-deny' || id === 'ks-deny') {
      const embed = new EmbedBuilder()
        .setTitle('❌ Denied')
        .setDescription(`Denied by <@${btn.user.id}>`)
        .setColor(RED)
        .setTimestamp();
      await btn.update({ embeds: [embed], components: [] });
    } else if (id === 'demo-open-modal') {
      const modal = new ModalBuilder()
        .setCustomId('demo-modal-submit')
        .setTitle('📝 Project Details');

      const nameInput = new TextInputBuilder()
        .setCustomId('project-name')
        .setLabel('Project Name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('e.g. a2discord');

      const descInput = new TextInputBuilder()
        .setCustomId('project-desc')
        .setLabel('Description')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('What does this project do?');

      const priorityInput = new TextInputBuilder()
        .setCustomId('project-priority')
        .setLabel('Priority (low/medium/high)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('medium');

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(descInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(priorityInput),
      );

      await btn.showModal(modal);
    } else if (id === 'ks-info') {
      await btn.reply({ content: 'ℹ️ This is an ephemeral details response — only you see this.', flags: ['Ephemeral'] as any });
    } else {
      await btn.reply({ content: `You clicked: **${id}**`, flags: ['Ephemeral'] as any });
    }
  }

  // Select menu
  if (interaction.isStringSelectMenu()) {
    const select = interaction as StringSelectMenuInteraction;
    const embed = new EmbedBuilder()
      .setTitle('Selection Made')
      .setDescription(`You selected: **${select.values.join(', ')}**`)
      .setColor(GREEN);
    await select.update({ embeds: [embed], components: [] });
  }

  // Modal submit
  if (interaction.isModalSubmit()) {
    const modal = interaction as ModalSubmitInteraction;
    if (modal.customId === 'demo-modal-submit') {
      const name = modal.fields.getTextInputValue('project-name');
      const desc = modal.fields.getTextInputValue('project-desc');
      const priority = modal.fields.getTextInputValue('project-priority') || 'medium';

      const embed = new EmbedBuilder()
        .setTitle('✅ Input Received')
        .setDescription('Form data collected successfully. In a real flow, this goes back to the A2A agent.')
        .setColor(GREEN)
        .addFields(
          { name: 'Project', value: name, inline: true },
          { name: 'Priority', value: priority, inline: true },
          { name: 'Description', value: desc, inline: false },
        )
        .setFooter({ text: 'A2H Intent: COLLECT → response' })
        .setTimestamp();

      await modal.reply({ embeds: [embed] });
    }
  }
});

// ─── Message handler ───

client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) return;
  if (msg.system) return;

  // Channel filter
  if (CHANNEL_FILTER.length > 0) {
    const channelId = msg.channel.type === ChannelType.PublicThread
      ? msg.channel.parentId ?? msg.channelId
      : msg.channelId;
    if (!CHANNEL_FILTER.includes(channelId) && !CHANNEL_FILTER.includes(msg.channelId)) {
      return;
    }
  }

  // Parse command
  const content = msg.content.trim();
  const cmd = content.startsWith('!')
    ? content.slice(1).split(/\s+/)[0].toLowerCase()
    : null;

  if (cmd && commands[cmd]) {
    try {
      await commands[cmd](msg);
    } catch (err) {
      console.error(`[demo-bot] Error in !${cmd}:`, err);
      const embed = new EmbedBuilder()
        .setTitle('❌ Command Error')
        .setDescription(`\`\`\`\n${(err as Error).message}\n\`\`\``)
        .setColor(RED);
      await msg.reply({ embeds: [embed] });
    }
  }
});

// ─── Startup ───

client.once(Events.ClientReady, (c) => {
  console.log(`[demo-bot] Online as ${c.user.tag}`);
  console.log(`[demo-bot] Guilds: ${c.guilds.cache.map(g => g.name).join(', ')}`);
  console.log(`[demo-bot] Channel filter: ${CHANNEL_FILTER.length ? CHANNEL_FILTER.join(', ') : 'all'}`);
  console.log('[demo-bot] Commands: ' + Object.keys(commands).map(c => `!${c}`).join(', '));
});

client.login(TOKEN);

// Graceful shutdown
process.on('SIGINT', () => { client.destroy(); process.exit(0); });
process.on('SIGTERM', () => { client.destroy(); process.exit(0); });
