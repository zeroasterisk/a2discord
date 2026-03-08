/**
 * a2discord — Discord transport adapter for A2A agents.
 *
 * Entry point: loads config from environment, creates adapter, starts it.
 */

import { A2DiscordAdapter } from './adapter/index.js';
import { loadConfigFromEnv } from './adapter/config.js';

export { A2DiscordAdapter } from './adapter/index.js';
export { A2AClient } from './adapter/client.js';
export { DiscordRenderer } from './rendering/index.js';
export { loadConfigFromEnv } from './adapter/config.js';
export type { AdapterConfig } from './adapter/config.js';
export * from './types.js';

// ─── Main entry point ───

async function main() {
  let config;
  try {
    config = loadConfigFromEnv();
  } catch (err) {
    console.error(`[a2discord] Configuration error: ${(err as Error).message}`);
    console.error('[a2discord] Required env vars: DISCORD_TOKEN (or A2DISCORD_BOT_TOKEN), A2A_AGENT_URL');
    process.exit(1);
  }

  const adapter = new A2DiscordAdapter(config);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[a2discord] Shutting down...');
    await adapter.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await adapter.start();
    console.log('[a2discord] Adapter started successfully');
  } catch (err) {
    console.error(`[a2discord] Failed to start: ${(err as Error).message}`);
    process.exit(1);
  }
}

// Run if this is the entry point
const isMain = process.argv[1]?.includes('a2discord') || process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js');
if (isMain) {
  main();
}
