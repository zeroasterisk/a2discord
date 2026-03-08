/**
 * Shared types for the a2discord adapter.
 */

// ─── A2A Protocol Types ───

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: {
    streaming?: boolean;
    pushNotifications?: boolean;
  };
  skills: AgentSkill[];
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
}

export interface Part {
  type: 'text' | 'data' | 'file';
  text?: string;
  data?: Record<string, unknown>;
  file?: { name: string; mimeType: string; uri?: string; bytes?: string };
}

export interface A2AMessage {
  role: 'user' | 'agent';
  parts: Part[];
  metadata?: Record<string, unknown>;
}

export type TaskState = 'submitted' | 'working' | 'input-required' | 'completed' | 'failed' | 'canceled';

export interface TaskStatus {
  state: TaskState;
  message?: A2AMessage;
  timestamp?: string;
}

export interface Artifact {
  name?: string;
  description?: string;
  parts: Part[];
  metadata?: Record<string, unknown>;
}

export interface Task {
  id: string;
  status: TaskStatus;
  history?: A2AMessage[];
  artifacts?: Artifact[];
  metadata?: Record<string, unknown>;
}

// ─── A2H Intent Types ───

export type A2HIntent = 'INFORM' | 'COLLECT' | 'AUTHORIZE' | 'ESCALATE' | 'RESULT';

// ─── JSON-RPC Types ───

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// ─── Task Send Params ───

export interface TaskSendParams {
  id?: string;
  message: A2AMessage;
  metadata?: Record<string, unknown>;
}

// ─── SSE Event Types ───

export interface SSEEvent {
  jsonrpc: '2.0';
  method?: string;
  params?: {
    id: string;
    status?: TaskStatus;
    artifact?: Artifact & { append?: boolean };
    final?: boolean;
  };
  error?: JsonRpcError;
}

// ─── Discord Rendering Types ───

export interface DiscordMessageOptions {
  content?: string;
  embeds?: unknown[];
  components?: unknown[];
  files?: unknown[];
}
