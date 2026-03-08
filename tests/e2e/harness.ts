#!/usr/bin/env bun
/**
 * E2E Test Harness for a2discord.
 *
 * Connects to a REAL Discord bot and runs conversation scenarios
 * against a test channel.
 *
 * Usage:
 *   bun run tests/e2e/harness.ts                    # run all scenarios
 *   bun run tests/e2e/harness.ts --interactive       # step-by-step with prompts
 *   bun run tests/e2e/harness.ts --scenario basic-echo
 *   bun run tests/e2e/harness.ts --list              # list available scenarios
 *
 * Environment:
 *   DISCORD_TOKEN        — bot token
 *   DISCORD_CHANNEL_ID   — test channel ID
 *   DISCORD_GUILD_ID     — test guild ID (optional)
 *   A2A_AGENT_URL        — agent URL (optional, for mock server)
 */

import { Client, GatewayIntentBits, type Message, type TextChannel } from 'discord.js';
import * as readline from 'readline';

// ─── Scenario Registry ───

export interface ScenarioContext {
  client: Client;
  channel: TextChannel;
  sendMessage: (content: string) => Promise<Message>;
  waitForBotMessage: (opts?: { timeout?: number; after?: Message }) => Promise<Message>;
  waitForBotEdit: (message: Message, opts?: { timeout?: number }) => Promise<Message>;
  clickButton: (message: Message, customId: string) => Promise<void>;
  interactive: boolean;
  log: (msg: string) => void;
  prompt: (question: string) => Promise<string>;
}

export interface Scenario {
  name: string;
  description: string;
  run: (ctx: ScenarioContext) => Promise<void>;
}

const scenarios = new Map<string, Scenario>();

export function registerScenario(scenario: Scenario) {
  scenarios.set(scenario.name, scenario);
}

// ─── Load scenarios ───

async function loadScenarios() {
  const scenarioFiles = [
    './scenarios/basic-echo',
    './scenarios/streaming',
    './scenarios/authorize',
    './scenarios/collect',
    './scenarios/error-handling',
  ];

  for (const file of scenarioFiles) {
    try {
      await import(file);
    } catch (err) {
      console.warn(`⚠ Failed to load scenario ${file}: ${(err as Error).message}`);
    }
  }
}

// ─── Helpers ───

function createContext(client: Client, channel: TextChannel, interactive: boolean): ScenarioContext {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return {
    client,
    channel,
    interactive,

    async sendMessage(content: string) {
      return channel.send(content);
    },

    async waitForBotMessage(opts = {}) {
      const timeout = opts.timeout ?? 10000;
      const after = opts.after;
      return new Promise<Message>((resolve, reject) => {
        const timer = setTimeout(() => {
          client.off('messageCreate', handler);
          reject(new Error(`Timed out waiting for bot message (${timeout}ms)`));
        }, timeout);

        function handler(msg: Message) {
          if (msg.channelId !== channel.id) return;
          if (!msg.author.bot) return;
          if (after && msg.createdTimestamp <= after.createdTimestamp) return;
          clearTimeout(timer);
          client.off('messageCreate', handler);
          resolve(msg);
        }

        client.on('messageCreate', handler);
      });
    },

    async waitForBotEdit(message: Message, opts = {}) {
      const timeout = opts.timeout ?? 10000;
      return new Promise<Message>((resolve, reject) => {
        const timer = setTimeout(() => {
          client.off('messageUpdate', handler);
          reject(new Error(`Timed out waiting for message edit (${timeout}ms)`));
        }, timeout);

        function handler(_old: any, newMsg: any) {
          if (newMsg.id === message.id) {
            clearTimeout(timer);
            client.off('messageUpdate', handler);
            resolve(newMsg);
          }
        }

        client.on('messageUpdate', handler);
      });
    },

    async clickButton(_message: Message, _customId: string) {
      // TODO: Implement via Discord API interaction endpoint
      // This requires sending a component interaction which isn't directly
      // supported by discord.js from the bot side. For E2E testing,
      // we'd need a user bot or webhook approach.
      throw new Error('Button clicking not yet implemented — use interactive mode');
    },

    log(msg: string) {
      console.log(`  ${msg}`);
    },

    async prompt(question: string) {
      if (!interactive) return 'y';
      return new Promise<string>((resolve) => {
        rl.question(`  ❓ ${question} `, (answer) => resolve(answer.trim()));
      });
    },
  };
}

// ─── CLI ───

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  await loadScenarios();

  if (args.includes('--list')) {
    console.log('\nAvailable scenarios:');
    for (const [name, scenario] of scenarios) {
      console.log(`  ${name.padEnd(20)} ${scenario.description}`);
    }
    process.exit(0);
  }

  // Validate environment
  const token = process.env.DISCORD_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;

  if (!token || !channelId) {
    console.error('❌ Missing required environment variables:');
    if (!token) console.error('   DISCORD_TOKEN');
    if (!channelId) console.error('   DISCORD_CHANNEL_ID');
    console.error('\nSee tests/README.md for setup instructions.');
    process.exit(1);
  }

  const interactive = args.includes('--interactive') || args.includes('-i');
  const scenarioFilter = args.find((a, i) => args[i - 1] === '--scenario')
    ?? args.find((a, i) => args[i - 1] === '-s');

  // Connect to Discord
  console.log('🔌 Connecting to Discord...');
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  await client.login(token);
  console.log(`✅ Logged in as ${client.user?.tag}`);

  const channel = await client.channels.fetch(channelId) as TextChannel;
  if (!channel?.isTextBased()) {
    console.error(`❌ Channel ${channelId} is not a text channel`);
    process.exit(1);
  }
  console.log(`📢 Using channel: #${channel.name}`);

  const ctx = createContext(client, channel, interactive);

  // Run scenarios
  const toRun = scenarioFilter
    ? [scenarios.get(scenarioFilter)].filter(Boolean) as Scenario[]
    : [...scenarios.values()];

  if (toRun.length === 0) {
    console.error(`❌ No scenarios found${scenarioFilter ? ` matching "${scenarioFilter}"` : ''}`);
    client.destroy();
    process.exit(1);
  }

  console.log(`\n🏃 Running ${toRun.length} scenario(s)...\n`);

  let passed = 0;
  let failed = 0;

  for (const scenario of toRun) {
    console.log(`▶ ${scenario.name}: ${scenario.description}`);
    try {
      if (interactive) {
        const answer = await ctx.prompt('Run this scenario? (y/n)');
        if (answer.toLowerCase() !== 'y') {
          console.log('  ⏭ Skipped\n');
          continue;
        }
      }
      await scenario.run(ctx);
      console.log('  ✅ Passed\n');
      passed++;
    } catch (err) {
      console.log(`  ❌ Failed: ${(err as Error).message}\n`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${toRun.length - passed - failed} skipped`);

  client.destroy();
  process.exit(failed > 0 ? 1 : 0);
}

function printUsage() {
  console.log(`
a2discord E2E Test Harness

Usage:
  bun run tests/e2e/harness.ts [options]

Options:
  --interactive, -i     Step through scenarios with prompts
  --scenario, -s NAME   Run only the named scenario
  --list                List available scenarios
  --help, -h            Show this help

Environment Variables:
  DISCORD_TOKEN         Bot token (required)
  DISCORD_CHANNEL_ID    Test channel ID (required)
  DISCORD_GUILD_ID      Test guild ID (optional)
  A2A_AGENT_URL         Agent URL (optional)

Examples:
  bun run test:e2e
  bun run test:e2e -- --interactive
  bun run test:e2e -- --scenario basic-echo
`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
