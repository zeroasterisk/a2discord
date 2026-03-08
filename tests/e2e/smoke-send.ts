import { Client, GatewayIntentBits, TextChannel } from 'discord.js';

const CHANNEL_ID = '1479976722085580863'; // #a2discord

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('ready', async (c) => {
  console.log(`✅ Connected as ${c.user.tag}`);
  const channel = await c.channels.fetch(CHANNEL_ID) as TextChannel;
  if (!channel) { console.error('Channel not found'); process.exit(1); }
  
  const msg = await channel.send('🧪 **a2discord smoke test** — zaf-sandbox bot is alive!');
  console.log(`✅ Sent message ${msg.id} to #${channel.name}`);
  
  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
setTimeout(() => { console.error('❌ Timeout'); process.exit(1); }, 15000);
