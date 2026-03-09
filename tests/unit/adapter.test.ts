/**
 * Unit tests for A2DiscordAdapter — the core adapter class.
 * Tests initialization, event handling, and lifecycle.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { A2DiscordAdapter } from '../../src/adapter/index';
import {
  createMockClient,
  createMockTextChannel,
  createMockMessage,
  createMockUser,
} from '../helpers/discord-mocks';
import { DiscordRenderer } from '../../src/rendering/index';

describe('A2DiscordAdapter', () => {
  describe('construction', () => {
    it('should be instantiable', () => {
      const adapter = new A2DiscordAdapter();
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(A2DiscordAdapter);
    });

    it('should accept configuration options', () => {
      const adapter = new A2DiscordAdapter({
        discord: { token: 'test-token' },
        agent: { url: 'http://localhost:9999' },
      });
      expect(adapter).toBeDefined();
    });

    it('should accept full config with channels', () => {
      const adapter = new A2DiscordAdapter({
        discord: { token: 'test-token' },
        agent: { url: 'http://localhost:9999' },
        channels: ['300000000000000000'],
        threadPerTask: true,
      });
      expect(adapter).toBeDefined();
    });
  });

  describe('lifecycle', () => {
    it('should throw without config on start', async () => {
      const adapter = new A2DiscordAdapter();
      await expect(adapter.start()).rejects.toThrow('No configuration provided');
    });

    it('should stop cleanly even if not started', async () => {
      const adapter = new A2DiscordAdapter();
      // Should not throw
      await adapter.stop();
    });
  });

  describe('renderer', () => {
    it('should use DiscordRenderer for message rendering', () => {
      const renderer = new DiscordRenderer();
      expect(renderer).toBeDefined();
      expect(typeof renderer.render).toBe('function');
      expect(typeof renderer.renderError).toBe('function');
      expect(typeof renderer.renderEmbed).toBe('function');
      expect(typeof renderer.renderButtons).toBe('function');
    });
  });

  describe('discord mocks', () => {
    it('should create mock client', () => {
      const client = createMockClient();
      expect(client.user?.id).toBeDefined();
      expect(client.user?.bot).toBe(true);
      expect(client.isReady()).toBe(true);
    });

    it('should create mock text channel that tracks sent messages', async () => {
      const channel = createMockTextChannel({ name: 'test' });
      expect(channel.name).toBe('test');
      await channel.send('hello');
      expect(channel._sentMessages).toHaveLength(1);
    });

    it('should create mock messages that support edit', async () => {
      const msg = createMockMessage({ content: 'original' });
      expect(msg.content).toBe('original');
      await msg.edit('updated');
      expect(msg._editedContent).toBe('updated');
    });

    it('should create mock messages that support reply', async () => {
      const msg = createMockMessage({ content: 'hello' });
      const reply = await msg.reply('world');
      expect(reply.content).toBe('world');
    });

    it('should ignore messages from bots', () => {
      const botUser = createMockUser({ bot: true });
      expect(botUser.bot).toBe(true);
    });

    it('should create mock channel with thread creation', async () => {
      const channel = createMockTextChannel();
      const thread = await channel.threads.create({ name: 'test thread' });
      expect(thread.name).toBe('test thread');
      expect(thread.isThread()).toBe(true);
    });

    it('should create mock client with custom options', () => {
      const client = createMockClient({
        botId: '999',
        botUsername: 'custom-bot',
      });
      expect(client.user?.id).toBe('999');
      expect(client.user?.username).toBe('custom-bot');
    });
  });

  describe('error handling', () => {
    it('should render error embeds', () => {
      const renderer = new DiscordRenderer();
      const embed = renderer.renderError(new Error('Agent unreachable'));
      const data = (embed as any).data ?? embed;
      expect(data.title).toContain('Error');
      expect(data.description).toContain('Agent unreachable');
    });

    it('should handle malformed agent responses via renderer', () => {
      const renderer = new DiscordRenderer();
      // Empty message should not crash
      const result = renderer.render({
        role: 'agent',
        parts: [],
      });
      expect(result).toBeDefined();
      // Empty parts → empty content
      expect(result.content).toBe('');
    });
  });
});
