import { Client, GatewayIntentBits } from 'discord.js';

const token = process.env.DISCORD_TOKEN || process.env.A2DISCORD_BOT_TOKEN;
if (!token) { console.error('No token'); process.exit(1); }

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', (c) => {
  console.log(`✅ Connected as ${c.user.tag} (${c.user.id})`);
  console.log(`Guilds: ${c.guilds.cache.map(g => `${g.name} (${g.id})`).join(', ') || 'none'}`);
  client.destroy();
  process.exit(0);
});

client.login(token);
setTimeout(() => { console.error('❌ Timeout'); process.exit(1); }, 15000);
