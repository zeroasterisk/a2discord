/**
 * Integration tests — A2H intent patterns end-to-end.
 * Tests the full message→task→response→Discord-message pipeline per intent.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MockA2AServer } from '../fixtures/mock-a2a-server';
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

beforeAll(async () => {
  server = new MockA2AServer();
  const port = await server.start();
  baseUrl = `http://localhost:${port}`;
});

afterAll(async () => {
  await server.stop();
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

    it.todo('should render INFORM response as Discord embed');
    it.todo('should set appropriate embed color and formatting');
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

    it.todo('should render "Provide Info" button');
    it.todo('should open modal with correct fields on button click');
    it.todo('should forward modal data to agent as user message');
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

    it.todo('should render approve/deny buttons');
    it.todo('should forward approval to agent');
    it.todo('should forward denial to agent');
    it.todo('should disable buttons after decision');
    it.todo('should auto-deny on timeout');
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

    it.todo('should edit original message with result');
    it.todo('should collapse buttons and interactive elements');
  });

  describe('full conversation flow', () => {
    it.todo('should handle: message → COLLECT → submit → AUTHORIZE → approve → RESULT');
    it.todo('should handle: message → INFORM → follow-up message → RESULT');
    it.todo('should handle: message → error → retry → success');
  });
});
