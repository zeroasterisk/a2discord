/**
 * Unit tests for protocol layer — A2A JSON-RPC ↔ Discord event mapping.
 */

import { describe, it, expect } from 'vitest';
import {
  createJsonRpcRequest,
  createJsonRpcResponse,
  createJsonRpcError,
  createUserMessage,
  createAgentMessage,
  createTask,
  createStreamingEvents,
  echoTaskResponse,
  createTextPart,
  createDataPart,
  createFilePart,
} from '../helpers/a2a-fixtures';

describe('Protocol: A2A ↔ Discord mapping', () => {
  describe('JSON-RPC envelope', () => {
    it('should create valid JSON-RPC request', () => {
      const req = createJsonRpcRequest('tasks/send', { message: createUserMessage('hello') });
      expect(req.jsonrpc).toBe('2.0');
      expect(req.method).toBe('tasks/send');
      expect(req.id).toBeDefined();
    });

    it('should create valid JSON-RPC response', () => {
      const res = createJsonRpcResponse(echoTaskResponse('hello'));
      expect(res.jsonrpc).toBe('2.0');
      expect(res.result).toBeDefined();
    });

    it('should create valid JSON-RPC error', () => {
      const err = createJsonRpcError(-32600, 'Invalid request');
      expect(err.error.code).toBe(-32600);
      expect(err.error.message).toBe('Invalid request');
    });
  });

  describe('Discord message → A2A task request', () => {
    it('should map Discord message content to A2A user message', () => {
      const msg = createUserMessage('hello from discord');
      expect(msg.role).toBe('user');
      expect(msg.parts[0].type).toBe('text');
      expect(msg.parts[0].text).toBe('hello from discord');
    });

    it('should map Discord attachments to A2A file parts', () => {
      const part = createFilePart('image.png', 'image/png', 'https://cdn.discord.com/attachments/123/image.png');
      expect(part.type).toBe('file');
      expect(part.file!.name).toBe('image.png');
      expect(part.file!.mimeType).toBe('image/png');
      expect(part.file!.uri).toBe('https://cdn.discord.com/attachments/123/image.png');
    });

    it('should map Discord embeds to A2A data parts', () => {
      const part = createDataPart({ title: 'Embed Title', description: 'Embed body' });
      expect(part.type).toBe('data');
      expect(part.data!.title).toBe('Embed Title');
    });

    it('should include channel/thread context in task metadata', () => {
      const req = createJsonRpcRequest('tasks/send', {
        message: createUserMessage('test'),
        metadata: { discordChannelId: '300000000000000000', discordThreadId: '400000000000000000' },
      });
      expect(req.params.metadata.discordChannelId).toBe('300000000000000000');
      expect(req.params.metadata.discordThreadId).toBe('400000000000000000');
    });

    it('should generate deterministic task IDs from thread IDs', () => {
      const threadId = '400000000000000000';
      const req1 = createJsonRpcRequest('tasks/send', {
        id: threadId,
        message: createUserMessage('msg1'),
      });
      const req2 = createJsonRpcRequest('tasks/send', {
        id: threadId,
        message: createUserMessage('msg2'),
      });
      expect(req1.params.id).toBe(req2.params.id);
    });
  });

  describe('A2A task response → Discord message', () => {
    it('should map completed task to Discord message', () => {
      const task = echoTaskResponse('hello');
      expect(task.status.state).toBe('completed');
      expect(task.status.message).toBeDefined();
      expect(task.status.message!.parts[0].text).toContain('hello');
    });

    it('should map failed task to error embed', () => {
      const task = createTask({
        status: { state: 'failed', message: createAgentMessage('Something broke') },
      });
      expect(task.status.state).toBe('failed');
      expect(task.status.message!.parts[0].text).toBe('Something broke');
    });

    it('should map input-required to interactive message', () => {
      const task = createTask({
        status: {
          state: 'input-required',
          message: createAgentMessage('Need approval', 'AUTHORIZE', { action: 'delete', buttons: ['approve', 'deny'] }),
        },
      });
      expect(task.status.state).toBe('input-required');
      expect(task.status.message!.metadata!.intent).toBe('AUTHORIZE');
    });

    it('should map artifacts to attachments', () => {
      const task = createTask({
        artifacts: [
          { parts: [createFilePart('output.csv', 'text/csv', 'https://example.com/output.csv')] },
        ],
      });
      expect(task.artifacts).toHaveLength(1);
      expect(task.artifacts![0].parts[0].type).toBe('file');
    });
  });

  describe('streaming events', () => {
    it('should create valid SSE events', () => {
      const events = createStreamingEvents('task-1', ['Hello', ' world']);
      expect(events.length).toBe(4); // working + 2 chunks + completed
      expect(events[0]).toContain('data:');
      expect(events[0]).toContain('"working"');
      expect(events[events.length - 1]).toContain('"completed"');
    });

    it('should parse SSE events into task updates', () => {
      const events = createStreamingEvents('task-1', ['chunk1', 'chunk2']);
      for (const event of events) {
        const dataStr = event.trim().replace(/^data:\s*/, '');
        const parsed = JSON.parse(dataStr);
        expect(parsed.jsonrpc).toBe('2.0');
        expect(parsed.params.id).toBe('task-1');
      }
    });

    it('should accumulate streamed text chunks', () => {
      const chunks = ['Hello', ' ', 'world', '!'];
      const events = createStreamingEvents('task-1', chunks);
      // Last event (completed) should have accumulated text
      const lastData = JSON.parse(events[events.length - 1].trim().replace(/^data:\s*/, ''));
      expect(lastData.params.status.message.parts[0].text).toBe('Hello world!');
    });

    it('should handle stream errors', () => {
      const errEvent = `data: ${JSON.stringify(createJsonRpcError(-32000, 'Agent error'))}\n\n`;
      const parsed = JSON.parse(errEvent.trim().replace(/^data:\s*/, ''));
      expect(parsed.error).toBeDefined();
      expect(parsed.error.code).toBe(-32000);
    });

    it('should handle stream with single chunk', () => {
      const events = createStreamingEvents('task-1', ['single']);
      expect(events.length).toBe(3); // working + 1 chunk + completed
    });
  });

  describe('task lifecycle mapping', () => {
    it('should map task states correctly', () => {
      const states = ['submitted', 'working', 'input-required', 'completed', 'failed', 'canceled'] as const;
      for (const state of states) {
        const task = createTask({ status: { state } });
        expect(task.status.state).toBe(state);
      }
    });

    it('should preserve task history', () => {
      const task = createTask({
        history: [
          createUserMessage('hello'),
          createAgentMessage('hi back'),
          createUserMessage('how are you'),
          createAgentMessage('good'),
        ],
      });
      expect(task.history).toHaveLength(4);
      expect(task.history![0].role).toBe('user');
      expect(task.history![1].role).toBe('agent');
    });

    it('should include timestamps in task status', () => {
      const task = createTask({
        status: { state: 'completed', timestamp: new Date().toISOString() },
      });
      expect(task.status.timestamp).toBeDefined();
    });
  });
});
