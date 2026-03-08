import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';

// Check via REST API first
const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
try {
  const guilds = await rest.get(Routes.userGuilds()) as any[];
  console.log(`REST guilds: ${guilds.map((g: any) => `${g.name} (${g.id})`).join(', ') || 'none'}`);
} catch (e: any) {
  console.log(`REST error: ${e.message}`);
}

// Then gateway
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ] 
});

client.once('ready', (c) => {
  console.log(`✅ Gateway: ${c.user.tag}`);
  console.log(`Gateway guilds: ${c.guilds.cache.map(g => `${g.name} (${g.id})`).join(', ') || 'none'}`);
  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
setTimeout(() => { console.error('❌ Timeout'); process.exit(1); }, 15000);
