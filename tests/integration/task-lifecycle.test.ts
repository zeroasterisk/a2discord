/**
 * Integration tests — full task lifecycle with mock A2A server.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MockA2AServer } from '../fixtures/mock-a2a-server';
import { createJsonRpcRequest, createUserMessage } from '../helpers/a2a-fixtures';

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

describe('Task Lifecycle (integration)', () => {
  describe('agent card discovery', () => {
    it('should serve agent card at well-known URL', async () => {
      const res = await fetch(`${baseUrl}/.well-known/agent.json`);
      expect(res.ok).toBe(true);
      const card = await res.json();
      expect(card.name).toBe('Test Agent');
      expect(card.capabilities.streaming).toBe(true);
      expect(card.skills).toHaveLength(1);
    });
  });

  describe('tasks/send', () => {
    it('should echo user message', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createJsonRpcRequest('tasks/send', {
          message: createUserMessage('hello world'),
        })),
      });
      const json = await res.json();
      expect(json.result.status.state).toBe('completed');
      expect(json.result.status.message.parts[0].text).toContain('hello world');
    });

    it('should return AUTHORIZE response', async () => {
      server.setScenario('authorize');
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createJsonRpcRequest('tasks/send', {
          message: createUserMessage('do something dangerous'),
        })),
      });
      const json = await res.json();
      expect(json.result.status.state).toBe('input-required');
      expect(json.result.status.message.metadata.intent).toBe('AUTHORIZE');
    });

    it('should return COLLECT response', async () => {
      server.setScenario('collect');
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createJsonRpcRequest('tasks/send', {
          message: createUserMessage('need info'),
        })),
      });
      const json = await res.json();
      expect(json.result.status.state).toBe('input-required');
      expect(json.result.status.message.metadata.intent).toBe('COLLECT');
    });

    it('should return failed task on error scenario', async () => {
      server.setScenario('error');
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createJsonRpcRequest('tasks/send', {
          message: createUserMessage('fail please'),
        })),
      });
      const json = await res.json();
      expect(json.result.status.state).toBe('failed');
    });

    it('should handle malformed response', async () => {
      server.setScenario('malformed');
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createJsonRpcRequest('tasks/send', {
          message: createUserMessage('bad'),
        })),
      });
      const text = await res.text();
      expect(() => JSON.parse(text)).toThrow();
    });
  });

  describe('tasks/sendSubscribe (SSE)', () => {
    it('should stream echo response', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createJsonRpcRequest('tasks/sendSubscribe', {
          message: createUserMessage('stream me'),
        })),
      });
      expect(res.headers.get('content-type')).toBe('text/event-stream');

      const text = await res.text();
      const events = text.split('\n\n').filter((e) => e.startsWith('data:'));
      expect(events.length).toBeGreaterThanOrEqual(3); // working + chunks + completed

      // First event should be working
      const first = JSON.parse(events[0].replace('data: ', ''));
      expect(first.params.status.state).toBe('working');

      // Last event should be completed
      const last = JSON.parse(events[events.length - 1].replace('data: ', ''));
      expect(last.params.status.state).toBe('completed');
    });
  });

  describe('request logging', () => {
    it('should log all requests', async () => {
      await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createJsonRpcRequest('tasks/send', {
          message: createUserMessage('test'),
        })),
      });
      const log = server.getRequestLog();
      expect(log).toHaveLength(1);
      expect(log[0].method).toBe('tasks/send');
    });
  });

  describe('custom handlers', () => {
    it('should use custom handler when set', async () => {
      server.setCustomHandler((params) => ({
        id: 'custom-1',
        status: { state: 'completed', message: { role: 'agent', parts: [{ type: 'text', text: 'custom!' }] } },
      }));

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createJsonRpcRequest('tasks/send', {
          message: createUserMessage('anything'),
        })),
      });
      const json = await res.json();
      expect(json.result.status.message.parts[0].text).toBe('custom!');
    });
  });
});
