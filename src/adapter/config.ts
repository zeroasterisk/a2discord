/**
 * Adapter configuration — loads from env vars and/or direct config.
 */

export interface AdapterConfig {
  discord: {
    token: string;
    guildId?: string;
  };
  agent: {
    url: string;
    name?: string;
  };
  channels?: string[];
  threadPerTask?: boolean;
  streaming?: 'buffer' | 'typing-then-post' | 'disabled';
}

export function loadConfigFromEnv(): AdapterConfig {
  const token = process.env.DISCORD_TOKEN || process.env.A2DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error('Missing DISCORD_TOKEN or A2DISCORD_BOT_TOKEN environment variable');
  }

  const agentUrl = process.env.A2A_AGENT_URL;
  if (!agentUrl) {
    throw new Error('Missing A2A_AGENT_URL environment variable');
  }

  const channels = process.env.A2DISCORD_CHANNELS
    ? process.env.A2DISCORD_CHANNELS.split(',').map((s) => s.trim())
    : undefined;

  return {
    discord: {
      token,
      guildId: process.env.DISCORD_GUILD_ID,
    },
    agent: {
      url: agentUrl,
      name: process.env.A2A_AGENT_NAME,
    },
    channels,
    threadPerTask: process.env.A2DISCORD_THREAD_PER_TASK !== 'false',
    streaming: (process.env.A2DISCORD_STREAMING as AdapterConfig['streaming']) || 'buffer',
  };
}
