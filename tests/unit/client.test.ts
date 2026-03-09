/**
 * Unit tests for A2AClient — HTTP client for A2A JSON-RPC protocol.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { A2AClient } from '../../src/adapter/client';
import { MockA2AServer } from '../fixtures/mock-a2a-server';

let server: MockA2AServer;
let baseUrl: string;

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

describe('A2AClient', () => {
  describe('construction', () => {
    it('should accept agent URL', () => {
      const client = new A2AClient('http://localhost:9999');
      expect(client).toBeDefined();
    });

    it('should strip trailing slash from URL', () => {
      const client = new A2AClient('http://localhost:9999/');
      expect(client).toBeDefined();
    });
  });

  describe('getAgentCard', () => {
    it('should fetch agent card', async () => {
      const client = new A2AClient(baseUrl);
      const card = await client.getAgentCard();
      expect(card.name).toBe('Test Agent');
      expect(card.version).toBe('1.0.0');
      expect(card.capabilities.streaming).toBe(true);
      expect(card.skills).toHaveLength(1);
    });

    it('should throw on unreachable agent', async () => {
      const client = new A2AClient('http://localhost:1');
      await expect(client.getAgentCard()).rejects.toThrow();
    });
  });

  describe('sendTask', () => {
    it('should send task and receive response', async () => {
      const client = new A2AClient(baseUrl);
      const task = await client.sendTask({
        message: { role: 'user', parts: [{ type: 'text', text: 'hello' }] },
      });
      expect(task.id).toBeDefined();
      expect(task.status.state).toBe('completed');
      expect(task.status.message?.parts[0].text).toContain('hello');
    });

    it('should send JSON-RPC formatted request', async () => {
      const client = new A2AClient(baseUrl);
      await client.sendTask({
        message: { role: 'user', parts: [{ type: 'text', text: 'test' }] },
      });
      const log = server.getRequestLog();
      expect(log).toHaveLength(1);
      expect(log[0].method).toBe('tasks/send');
    });

    it('should handle failed task response', async () => {
      server.setScenario('error');
      const client = new A2AClient(baseUrl);
      const task = await client.sendTask({
        message: { role: 'user', parts: [{ type: 'text', text: 'fail' }] },
      });
      expect(task.status.state).toBe('failed');
    });

    it('should throw on malformed response', async () => {
      server.setScenario('malformed');
      const client = new A2AClient(baseUrl);
      await expect(
        client.sendTask({
          message: { role: 'user', parts: [{ type: 'text', text: 'bad' }] },
        })
      ).rejects.toThrow('Invalid JSON');
    });

    it('should pass task ID when provided', async () => {
      const client = new A2AClient(baseUrl);
      const task = await client.sendTask({
        id: 'custom-task-id',
        message: { role: 'user', parts: [{ type: 'text', text: 'with id' }] },
      });
      expect(task.id).toBe('custom-task-id');
    });
  });

  describe('sendSubscribe (SSE streaming)', () => {
    it('should stream events', async () => {
      const client = new A2AClient(baseUrl);
      const events: any[] = [];
      for await (const event of client.sendSubscribe({
        message: { role: 'user', parts: [{ type: 'text', text: 'stream me' }] },
      })) {
        events.push(event);
      }
      expect(events.length).toBeGreaterThanOrEqual(3);
    });

    it('should receive working status first', async () => {
      const client = new A2AClient(baseUrl);
      const events: any[] = [];
      for await (const event of client.sendSubscribe({
        message: { role: 'user', parts: [{ type: 'text', text: 'test' }] },
      })) {
        events.push(event);
      }
      expect(events[0].params?.status?.state).toBe('working');
    });

    it('should receive completed status last', async () => {
      const client = new A2AClient(baseUrl);
      const events: any[] = [];
      for await (const event of client.sendSubscribe({
        message: { role: 'user', parts: [{ type: 'text', text: 'test' }] },
      })) {
        events.push(event);
      }
      const last = events[events.length - 1];
      expect(last.params?.status?.state).toBe('completed');
    });

    it('should handle stream errors', async () => {
      server.setScenario('error');
      const client = new A2AClient(baseUrl);
      const events: any[] = [];
      for await (const event of client.sendSubscribe({
        message: { role: 'user', parts: [{ type: 'text', text: 'fail' }] },
      })) {
        events.push(event);
      }
      expect(events.some((e) => e.error)).toBe(true);
    });
  });
});
