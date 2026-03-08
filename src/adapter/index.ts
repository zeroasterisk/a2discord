/**
 * Main adapter — bridges Discord and A2A agents.
 */

import {
  Client,
  GatewayIntentBits,
  Events,
  ChannelType,
  type Message,
  type TextChannel,
  type ThreadChannel,
} from 'discord.js';
import { A2AClient } from './client.js';
import { DiscordRenderer } from '../rendering/index.js';
import type { AdapterConfig } from './config.js';
import type { A2AMessage, TaskSendParams } from '../types.js';

export class A2DiscordAdapter {
  private config: AdapterConfig | null;
  private client: Client | null = null;
  private a2aClient: A2AClient | null = null;
  private renderer = new DiscordRenderer();
  private threadTasks = new Map<string, string>(); // threadId → taskId

  constructor(config?: AdapterConfig) {
    this.config = config ?? null;
  }

  async start(): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration provided');
    }

    this.a2aClient = new A2AClient(this.config.agent.url);

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.client.on(Events.MessageCreate, (msg) => this.handleMessage(msg));

    this.client.once(Events.ClientReady, async (readyClient) => {
      console.log(`[a2discord] Logged in as ${readyClient.user.tag}`);

      // Try to fetch agent card
      try {
        const card = await this.a2aClient!.getAgentCard();
        console.log(`[a2discord] Connected to agent: ${card.name} (${card.version})`);
      } catch (err) {
        console.warn(`[a2discord] Could not fetch agent card: ${(err as Error).message}`);
      }

      // Post startup message to configured channels
      if (this.config!.channels?.length) {
        for (const channelId of this.config!.channels) {
          try {
            const channel = await readyClient.channels.fetch(channelId);
            if (channel?.isTextBased() && 'send' in channel) {
              await (channel as TextChannel).send(
                `🤖 **a2discord** adapter online. Connected to agent at \`${this.config!.agent.url}\``
              );
            }
          } catch {
            // channel not accessible, skip
          }
        }
      }
    });

    await this.client.login(this.config.discord.token);
  }

  async stop(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    // Ignore bots and system messages
    if (message.author.bot) return;
    if (message.system) return;

    // Check channel filter
    if (this.config?.channels?.length) {
      const channelId = message.channel.type === ChannelType.PublicThread
        ? (message.channel as ThreadChannel).parentId ?? message.channelId
        : message.channelId;
      if (!this.config.channels.includes(channelId) && !this.config.channels.includes(message.channelId)) {
        return;
      }
    }

    // Show typing
    try {
      if ('sendTyping' in message.channel) {
        await (message.channel as TextChannel).sendTyping();
      }
    } catch {
      // ignore typing errors
    }

    // Determine thread to use
    let targetChannel = message.channel;
    let taskId: string | undefined;

    if (this.config?.threadPerTask !== false && message.channel.type !== ChannelType.PublicThread) {
      // Create a thread for the conversation
      try {
        const thread = await (message.channel as TextChannel).threads.create({
          name: `💬 ${message.content.slice(0, 50) || 'New conversation'}`,
          startMessage: message,
        });
        targetChannel = thread;
        taskId = thread.id;
        this.threadTasks.set(thread.id, taskId);
      } catch {
        // Fall back to channel if thread creation fails
      }
    } else if (message.channel.type === ChannelType.PublicThread) {
      taskId = this.threadTasks.get(message.channelId) ?? message.channelId;
    }

    // Build A2A message
    const a2aMessage: A2AMessage = {
      role: 'user',
      parts: [{ type: 'text', text: message.content }],
      metadata: {
        discordUserId: message.author.id,
        discordUsername: message.author.username,
        discordChannelId: message.channelId,
      },
    };

    const params: TaskSendParams = {
      id: taskId,
      message: a2aMessage,
    };

    // Send to A2A agent
    try {
      const task = await this.a2aClient!.sendTask(params);

      // Render response
      if (task.status.message) {
        const rendered = this.renderer.render(task.status.message);
        await this.sendRendered(targetChannel as TextChannel, rendered);
      } else if (task.status.state === 'failed') {
        const errEmbed = this.renderer.renderError(new Error('Task failed without a message'));
        await (targetChannel as TextChannel).send({ embeds: [errEmbed] });
      }
    } catch (err) {
      const errEmbed = this.renderer.renderError(err as Error);
      try {
        await (targetChannel as TextChannel).send({ embeds: [errEmbed] });
      } catch {
        // Can't send error message, log it
        console.error('[a2discord] Failed to send error to Discord:', (err as Error).message);
      }
    }
  }

  private async sendRendered(
    channel: TextChannel | ThreadChannel,
    options: { content?: string; embeds?: unknown[]; components?: unknown[] }
  ): Promise<void> {
    // discord.js send accepts these directly
    await channel.send(options as Parameters<TextChannel['send']>[0]);
  }
}

export { A2AClient } from './client.js';
export { DiscordRenderer } from '../rendering/index.js';
export type { AdapterConfig } from './config.js';
export { loadConfigFromEnv } from './config.js';
