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
  embeds?: any[];
  components?: any[];
  files?: any[];
}

// ─── A2UI v0.9 Wire Format Types ───

export const DISCORD_CATALOG_ID = 'https://github.com/zeroasterisk/a2discord/catalog/v1/discord_catalog.json';

/** A2UI v0.9 message — one of several message types */
export interface A2UIMessage {
  version: 'v0.9';
  createSurface?: A2UICreateSurface;
  updateComponents?: A2UIUpdateComponents;
  updateDataModel?: A2UIUpdateDataModel;
}

export interface A2UICreateSurface {
  surfaceId: string;
  catalogId: string;
}

export interface A2UIUpdateComponents {
  surfaceId: string;
  components: DiscordComponent[];
}

export interface A2UIUpdateDataModel {
  surfaceId: string;
  path?: string;
  value?: unknown;
}

// ─── Discord Catalog Component Types ───

export type DiscordComponent =
  | DiscordMessageComponent
  | DiscordEmbedComponent
  | DiscordActionRowComponent
  | DiscordButtonComponent
  | DiscordSelectMenuComponent
  | DiscordModalComponent
  | DiscordTextInputComponent;

interface ComponentBase {
  id: string;
  component: string;
}

export interface DiscordMessageComponent extends ComponentBase {
  component: 'DiscordMessage';
  content?: string;
  embeds?: DiscordEmbedComponent[];
  components?: DiscordActionRowComponent[];
  ephemeral?: boolean;
}

export interface DiscordEmbedComponent extends ComponentBase {
  component: 'DiscordEmbed';
  title?: string;
  description?: string;
  color?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  thumbnail?: string;
  image?: string;
  footer?: string;
  timestamp?: boolean;
}

export interface DiscordActionRowComponent extends ComponentBase {
  component: 'DiscordActionRow';
  children: (DiscordButtonComponent | DiscordSelectMenuComponent)[];
}

export interface DiscordButtonComponent extends ComponentBase {
  component: 'DiscordButton';
  label: string;
  style?: 'primary' | 'secondary' | 'success' | 'danger' | 'link';
  customId?: string;
  url?: string;
  emoji?: string;
  disabled?: boolean;
}

export interface DiscordSelectMenuComponent extends ComponentBase {
  component: 'DiscordSelectMenu';
  customId: string;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  options: { label: string; value: string; description?: string; emoji?: string; default?: boolean }[];
}

export interface DiscordModalComponent extends ComponentBase {
  component: 'DiscordModal';
  title: string;
  customId: string;
  fields: DiscordTextInputComponent[];
}

export interface DiscordTextInputComponent extends ComponentBase {
  component: 'DiscordTextInput';
  customId: string;
  label: string;
  style?: 'short' | 'paragraph';
  placeholder?: string;
  required?: boolean;
  value?: string;
  minLength?: number;
  maxLength?: number;
}

// ─── Renderer Result Types ───

export interface DiscordRenderResult {
  messages: DiscordMessageOptions[];
  modals: unknown[]; // ModalBuilder instances
}
