/**
 * A2A HTTP Client — JSON-RPC 2.0 over HTTP with SSE streaming support.
 */

import type { AgentCard, Task, TaskSendParams, SSEEvent, JsonRpcResponse } from '../types.js';

let rpcIdCounter = 0;

export class A2AClient {
  private agentUrl: string;

  constructor(agentUrl: string) {
    this.agentUrl = agentUrl.replace(/\/$/, '');
  }

  async getAgentCard(): Promise<AgentCard> {
    const url = `${this.agentUrl}/.well-known/agent.json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch agent card: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as AgentCard;
  }

  async sendTask(params: TaskSendParams): Promise<Task> {
    const body = {
      jsonrpc: '2.0' as const,
      id: ++rpcIdCounter,
      method: 'tasks/send',
      params,
    };

    const res = await fetch(this.agentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`A2A request failed: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    let json: JsonRpcResponse;
    try {
      json = JSON.parse(text) as JsonRpcResponse;
    } catch {
      throw new Error(`Invalid JSON response from agent: ${text.slice(0, 200)}`);
    }

    if (json.error) {
      throw new Error(`A2A error [${json.error.code}]: ${json.error.message}`);
    }

    return json.result as Task;
  }

  async *sendSubscribe(params: TaskSendParams): AsyncGenerator<SSEEvent> {
    const body = {
      jsonrpc: '2.0' as const,
      id: ++rpcIdCounter,
      method: 'tasks/sendSubscribe',
      params,
    };

    const res = await fetch(this.agentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`A2A streaming request failed: ${res.status} ${res.statusText}`);
    }

    if (!res.body) {
      throw new Error('No response body for SSE stream');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const chunk of lines) {
          const trimmed = chunk.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          try {
            yield JSON.parse(dataStr) as SSEEvent;
          } catch {
            // skip malformed SSE events
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim().startsWith('data:')) {
        const dataStr = buffer.trim().replace(/^data:\s*/, '');
        try {
          yield JSON.parse(dataStr) as SSEEvent;
        } catch {
          // skip
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
