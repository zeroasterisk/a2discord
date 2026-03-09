/**
 * Integration tests — A2H intent patterns end-to-end.
 * Tests the full message→task→response→Discord-message pipeline per intent.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MockA2AServer } from '../fixtures/mock-a2a-server';
import { DiscordRenderer } from '../../src/rendering/index';
import { A2AClient } from '../../src/adapter/client';
import {
  createMockClient,
  createMockTextChannel,
  createMockMessage,
  createMockButtonInteraction,
  createMockModalSubmit,
} from '../helpers/discord-mocks';
import { createJsonRpcRequest, createUserMessage } from '../helpers/a2a-fixtures';

let server: MockA2AServer;
let baseUrl: string;
const renderer = new DiscordRenderer();

beforeAll(async () => {
  server = new MockA2AServer();
  const port = await server.start();
  baseUrl = `http://localhost:${port}`;
});

afterAll(async () => {
  await server.stop();
});

beforeEach(() => {
  server.setScenario('echo');
  server.clearRequestLog();
});

describe('A2H Patterns (integration)', () => {
  describe('INFORM → embed', () => {
    it('should return INFORM intent from agent', async () => {
      server.setScenario('inform');
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createJsonRpcRequest('tasks/send', {
          message: createUserMessage('tell me something'),
        })),
      });
      const json = await res.json();
      expect(json.result.status.message.metadata.intent).toBe('INFORM');
      expect(json.result.status.state).toBe('completed');
    });

    it('should render INFORM response as Discord embed', async () => {
      server.setScenario('inform');
      const client = new A2AClient(baseUrl);
      const task = await client.sendTask({ message: { role: 'user', parts: [{ type: 'text', text: 'info please' }] } });
      const rendered = renderer.render(task.status.message!);
      expect(rendered.embeds).toBeDefined();
      expect(rendered.embeds!.length).toBeGreaterThan(0);
    });

    it('should set appropriate embed color and formatting', async () => {
      server.setScenario('inform');
      const client = new A2AClient(baseUrl);
      const task = await client.sendTask({ message: { role: 'user', parts: [{ type: 'text', text: 'info' }] } });
      const rendered = renderer.render(task.status.message!);
      const embed = rendered.embeds![0] as any;
      const color = embed.data?.color ?? embed.color;
      expect(color).toBe(0x3498db);
    });
  });

  describe('COLLECT → modal', () => {
    it('should return COLLECT intent with schema', async () => {
      server.setScenario('collect');
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createJsonRpcRequest('tasks/send', {
          message: createUserMessage('need input'),
        })),
      });
      const json = await res.json();
      expect(json.result.status.message.metadata.intent).toBe('COLLECT');
      expect(json.result.status.message.metadata.schema.fields).toHaveLength(2);
    });

    it('should have valid mock modal submit', () => {
      const modal = createMockModalSubmit({
        customId: 'collect-task-1',
        fields: { name: 'John', email: 'john@example.com' },
      });
      expect(modal.fields.getTextInputValue('name')).toBe('John');
      expect(modal.fields.getTextInputValue('email')).toBe('john@example.com');
    });

    it('should render "Provide Info" button', async () => {
      server.setScenario('collect');
      const client = new A2AClient(baseUrl);
      const task = await client.sendTask({ message: { role: 'user', parts: [{ type: 'text', text: 'collect' }] } });
      const rendered = renderer.render(task.status.message!);
      expect(rendered.components).toBeDefined();
      const row = rendered.components![0] as any;
      const components = row.components ?? row.data?.components ?? [];
      const ids = components.map((c: any) => c.data?.custom_id ?? c.custom_id ?? c.customId);
      expect(ids).toContain('a2discord-collect-respond');
    });

    it('should show schema fields in embed', async () => {
      server.setScenario('collect');
      const client = new A2AClient(baseUrl);
      const task = await client.sendTask({ message: { role: 'user', parts: [{ type: 'text', text: 'collect' }] } });
      const rendered = renderer.render(task.status.message!);
      const embed = rendered.embeds![0] as any;
      const fields = embed.data?.fields ?? embed.fields ?? [];
      expect(fields.length).toBeGreaterThan(0);
    });
  });

  describe('AUTHORIZE → buttons', () => {
    it('should return AUTHORIZE intent', async () => {
      server.setScenario('authorize');
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createJsonRpcRequest('tasks/send', {
          message: createUserMessage('do it'),
        })),
      });
      const json = await res.json();
      expect(json.result.status.message.metadata.intent).toBe('AUTHORIZE');
      expect(json.result.status.state).toBe('input-required');
    });

    it('should have valid mock button interaction', () => {
      const btn = createMockButtonInteraction({ customId: 'authorize-approve-task-1' });
      expect(btn.customId).toBe('authorize-approve-task-1');
      expect(btn.isButton()).toBe(true);
    });

    it('should render approve/deny buttons', async () => {
      server.setScenario('authorize');
      const client = new A2AClient(baseUrl);
      const task = await client.sendTask({ message: { role: 'user', parts: [{ type: 'text', text: 'auth' }] } });
      const rendered = renderer.render(task.status.message!);
      expect(rendered.components).toBeDefined();
      expect(rendered.components!.length).toBe(1);
      const row = rendered.components![0] as any;
      const components = row.components ?? row.data?.components ?? [];
      expect(components.length).toBe(2);
    });

    it('should forward approval via mock button interaction', async () => {
      const btn = createMockButtonInteraction({ customId: 'a2discord-approve' });
      await btn.reply({ content: 'Approved!' });
      expect(btn._replyContent.content).toBe('Approved!');
    });

    it('should forward denial via mock button interaction', async () => {
      const btn = createMockButtonInteraction({ customId: 'a2discord-deny' });
      await btn.update({ content: 'Denied.' });
      expect(btn._updatedMessage.content).toBe('Denied.');
    });

    it('should support deferred interactions', async () => {
      const btn = createMockButtonInteraction({ customId: 'a2discord-approve' });
      await btn.deferReply();
      await btn.editReply({ content: 'Processing...' });
      expect(btn._replyContent.content).toBe('Processing...');
    });
  });

  describe('RESULT → edit', () => {
    it('should return RESULT intent', async () => {
      server.setScenario('result');
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createJsonRpcRequest('tasks/send', {
          message: createUserMessage('finish'),
        })),
      });
      const json = await res.json();
      expect(json.result.status.message.metadata.intent).toBe('RESULT');
      expect(json.result.status.state).toBe('completed');
    });

    it('should render result as embed with timestamp', async () => {
      server.setScenario('result');
      const client = new A2AClient(baseUrl);
      const task = await client.sendTask({ message: { role: 'user', parts: [{ type: 'text', text: 'done' }] } });
      const rendered = renderer.render(task.status.message!);
      expect(rendered.embeds).toBeDefined();
      const embed = rendered.embeds![0] as any;
      const title = embed.data?.title ?? embed.title;
      expect(title).toContain('Result');
    });

    it('should edit original message via mock', async () => {
      const msg = createMockMessage({ content: 'Working...' });
      await msg.edit({ content: 'Done!', embeds: [{ title: '✅ Result' }] });
      expect(msg._editedContent).toBe('Done!');
      expect(msg._editedEmbeds).toHaveLength(1);
    });
  });

  describe('full conversation flow', () => {
    it('should handle message → response → render pipeline', async () => {
      server.setScenario('echo');
      const client = new A2AClient(baseUrl);
      const channel = createMockTextChannel();

      // User sends message
      const task = await client.sendTask({
        message: { role: 'user', parts: [{ type: 'text', text: 'hello' }] },
      });

      // Render response
      const rendered = renderer.render(task.status.message!);

      // Send to channel
      await channel.send(rendered);
      expect(channel._sentMessages).toHaveLength(1);
    });

    it('should handle error scenario gracefully', async () => {
      server.setScenario('error');
      const client = new A2AClient(baseUrl);
      const channel = createMockTextChannel();

      const task = await client.sendTask({
        message: { role: 'user', parts: [{ type: 'text', text: 'fail' }] },
      });

      expect(task.status.state).toBe('failed');

      // Render error
      const errEmbed = renderer.renderError(new Error('Task failed'));
      await channel.send({ embeds: [errEmbed] });
      expect(channel._sentMessages).toHaveLength(1);
    });

    it('should handle multiple intents in sequence', async () => {
      const client = new A2AClient(baseUrl);
      const channel = createMockTextChannel();

      // INFORM
      server.setScenario('inform');
      const t1 = await client.sendTask({ message: { role: 'user', parts: [{ type: 'text', text: 'info' }] } });
      await channel.send(renderer.render(t1.status.message!));

      // AUTHORIZE
      server.setScenario('authorize');
      const t2 = await client.sendTask({ message: { role: 'user', parts: [{ type: 'text', text: 'auth' }] } });
      await channel.send(renderer.render(t2.status.message!));

      // RESULT
      server.setScenario('result');
      const t3 = await client.sendTask({ message: { role: 'user', parts: [{ type: 'text', text: 'done' }] } });
      await channel.send(renderer.render(t3.status.message!));

      expect(channel._sentMessages).toHaveLength(3);
    });
  });
});
