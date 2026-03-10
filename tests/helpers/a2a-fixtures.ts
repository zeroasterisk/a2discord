/**
 * A2A protocol fixtures + Discord catalog A2UI v0.9 factories.
 */

import type {
  A2UIMessage,
  DiscordMessageComponent,
  DiscordEmbedComponent,
  DiscordActionRowComponent,
  DiscordButtonComponent,
  DiscordSelectMenuComponent,
  DiscordModalComponent,
  DiscordTextInputComponent,
  DiscordComponent,
} from '../../src/types';
import { DISCORD_CATALOG_ID } from '../../src/types';

// ─── A2A Types ───

export interface A2APart {
  type: 'text' | 'data' | 'file';
  text?: string;
  data?: Record<string, unknown>;
  file?: { name: string; mimeType: string; uri?: string; bytes?: string };
}

export interface A2AMessage {
  role: 'user' | 'agent';
  parts: A2APart[];
  metadata?: Record<string, unknown>;
}

export type TaskState = 'submitted' | 'working' | 'input-required' | 'completed' | 'failed' | 'canceled';

export interface A2ATask {
  id: string;
  status: {
    state: TaskState;
    message?: A2AMessage;
    timestamp?: string;
  };
  history?: A2AMessage[];
  artifacts?: A2AArtifact[];
  metadata?: Record<string, unknown>;
}

export interface A2AArtifact {
  name?: string;
  description?: string;
  parts: A2APart[];
  metadata?: Record<string, unknown>;
}

export interface A2AAgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: { streaming?: boolean; pushNotifications?: boolean };
  skills: { id: string; name: string; description: string }[];
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
}

export type A2HIntent = 'INFORM' | 'COLLECT' | 'AUTHORIZE' | 'ESCALATE' | 'RESULT';

// ─── A2A Factories ───

let taskCounter = 0;

export function createTaskId(): string {
  return `task-${++taskCounter}-${Date.now()}`;
}

export function resetTaskCounter() { taskCounter = 0; }

export function createTextPart(text: string): A2APart {
  return { type: 'text', text };
}

export function createDataPart(data: Record<string, unknown>): A2APart {
  return { type: 'data', data };
}

export function createFilePart(name: string, mimeType: string, uri?: string): A2APart {
  return { type: 'file', file: { name, mimeType, uri } };
}

export function createMessage(role: 'user' | 'agent', text: string, metadata?: Record<string, unknown>): A2AMessage {
  return { role, parts: [createTextPart(text)], metadata };
}

export function createUserMessage(text: string): A2AMessage {
  return createMessage('user', text);
}

export function createAgentMessage(text: string, intent?: A2HIntent, extra?: Record<string, unknown>): A2AMessage {
  const metadata = intent ? { intent, ...extra } : extra;
  return createMessage('agent', text, metadata);
}

export function createTask(overrides: Partial<A2ATask> = {}): A2ATask {
  return {
    id: overrides.id ?? createTaskId(),
    status: overrides.status ?? { state: 'completed', message: createAgentMessage('Done.') },
    history: overrides.history,
    artifacts: overrides.artifacts,
    metadata: overrides.metadata,
  };
}

// ─── JSON-RPC ───

export function createJsonRpcRequest(method: string, params: Record<string, unknown>, id?: string | number) {
  return { jsonrpc: '2.0' as const, id: id ?? 1, method, params };
}

export function createJsonRpcResponse(result: unknown, id?: string | number) {
  return { jsonrpc: '2.0' as const, id: id ?? 1, result };
}

export function createJsonRpcError(code: number, message: string, id?: string | number, data?: unknown) {
  return { jsonrpc: '2.0' as const, id: id ?? 1, error: { code, message, data } };
}

// ─── Canned A2A Scenarios ───

export function echoTaskResponse(userText: string, taskId?: string): A2ATask {
  const id = taskId ?? createTaskId();
  return createTask({
    id, status: { state: 'completed', message: createAgentMessage(`Echo: ${userText}`) },
    history: [createUserMessage(userText), createAgentMessage(`Echo: ${userText}`)],
  });
}

export function authorizeTaskResponse(action: string, taskId?: string): A2ATask {
  const id = taskId ?? createTaskId();
  return createTask({
    id, status: {
      state: 'input-required',
      message: createAgentMessage(`Requesting approval to: ${action}`, 'AUTHORIZE', { action, buttons: ['approve', 'deny'] }),
    },
  });
}

export function collectTaskResponse(fields: { name: string; label: string; required?: boolean }[], taskId?: string): A2ATask {
  const id = taskId ?? createTaskId();
  return createTask({
    id, status: {
      state: 'input-required',
      message: createAgentMessage('Please provide the following information:', 'COLLECT', { schema: { fields } }),
    },
  });
}

export function informTaskResponse(info: string, taskId?: string): A2ATask {
  const id = taskId ?? createTaskId();
  return createTask({ id, status: { state: 'completed', message: createAgentMessage(info, 'INFORM') } });
}

export function resultTaskResponse(outcome: string, taskId?: string): A2ATask {
  const id = taskId ?? createTaskId();
  return createTask({ id, status: { state: 'completed', message: createAgentMessage(outcome, 'RESULT', { success: true }) } });
}

export function failedTaskResponse(error: string, taskId?: string): A2ATask {
  const id = taskId ?? createTaskId();
  return createTask({ id, status: { state: 'failed', message: createAgentMessage(error) } });
}

export function createStreamingEvents(taskId: string, chunks: string[]): string[] {
  const events: string[] = [];
  events.push(`data: ${JSON.stringify({ jsonrpc: '2.0', method: 'tasks/status', params: { id: taskId, status: { state: 'working' }, final: false } })}\n\n`);
  for (let i = 0; i < chunks.length; i++) {
    events.push(`data: ${JSON.stringify({ jsonrpc: '2.0', method: 'tasks/artifact', params: { id: taskId, artifact: { parts: [{ type: 'text', text: chunks[i] }], append: i > 0 } } })}\n\n`);
  }
  events.push(`data: ${JSON.stringify({ jsonrpc: '2.0', method: 'tasks/status', params: { id: taskId, status: { state: 'completed', message: createAgentMessage(chunks.join('')) }, final: true } })}\n\n`);
  return events;
}

// ─── Discord Catalog A2UI v0.9 Factories ───

let a2uiCounter = 0;

export function resetA2UICounter() { a2uiCounter = 0; }

function a2uiId(prefix: string): string {
  return `${prefix}-${++a2uiCounter}`;
}

/** Create a pair of A2UI v0.9 messages (createSurface + updateComponents) */
export function createA2UIMessages(surfaceId: string, root: DiscordMessageComponent): A2UIMessage[] {
  return [
    { version: 'v0.9', createSurface: { surfaceId, catalogId: DISCORD_CATALOG_ID } },
    { version: 'v0.9', updateComponents: { surfaceId, components: [root] } },
  ];
}

/** Create a simple DiscordMessage with one embed */
export function createDiscordMessageWithEmbed(
  title: string,
  description: string,
  opts?: { color?: string; fields?: { name: string; value: string; inline?: boolean }[]; footer?: string },
): DiscordMessageComponent {
  const embed: DiscordEmbedComponent = {
    id: a2uiId('embed'),
    component: 'DiscordEmbed',
    title,
    description,
    ...(opts?.color ? { color: opts.color } : {}),
    ...(opts?.fields ? { fields: opts.fields } : {}),
    ...(opts?.footer ? { footer: opts.footer } : {}),
  };
  return { id: 'root', component: 'DiscordMessage', embeds: [embed] };
}

/** Create a DiscordMessage with buttons */
export function createDiscordMessageWithButtons(
  embedTitle: string,
  buttons: { label: string; style?: string; customId: string }[],
): DiscordMessageComponent {
  return {
    id: 'root', component: 'DiscordMessage',
    embeds: [{ id: a2uiId('embed'), component: 'DiscordEmbed', title: embedTitle, color: '#3498db' }],
    components: [{
      id: a2uiId('row'), component: 'DiscordActionRow',
      children: buttons.map(b => ({
        id: a2uiId('btn'),
        component: 'DiscordButton' as const,
        label: b.label,
        style: (b.style ?? 'secondary') as any,
        customId: b.customId,
      })),
    }],
  };
}

/** Create a DiscordMessage with a select menu */
export function createDiscordMessageWithSelect(
  embedTitle: string,
  options: { label: string; value: string; description?: string }[],
  customId?: string,
): DiscordMessageComponent {
  return {
    id: 'root', component: 'DiscordMessage',
    embeds: [{ id: a2uiId('embed'), component: 'DiscordEmbed', title: embedTitle, color: '#3498db' }],
    components: [{
      id: a2uiId('row'), component: 'DiscordActionRow',
      children: [{
        id: a2uiId('select'), component: 'DiscordSelectMenu',
        customId: customId ?? 'test-select',
        placeholder: 'Choose...',
        options,
      }],
    }],
  };
}

/** Create a DiscordModal with text inputs */
export function createDiscordModal(
  title: string,
  customId: string,
  fields: { label: string; customId: string; style?: 'short' | 'paragraph' }[],
): DiscordModalComponent {
  return {
    id: a2uiId('modal'), component: 'DiscordModal',
    title, customId,
    fields: fields.map(f => ({
      id: a2uiId('input'), component: 'DiscordTextInput' as const,
      customId: f.customId, label: f.label, style: f.style ?? 'short',
    })),
  };
}

/** Wrap A2UI messages into an A2A message data part */
export function createA2UIDataMessage(
  a2uiMessages: A2UIMessage[],
  intent?: A2HIntent,
): A2AMessage {
  return {
    role: 'agent',
    parts: [{ type: 'data', data: { a2ui: a2uiMessages } }],
    metadata: intent ? { intent } : undefined,
  };
}

/** Default agent card */
export function createAgentCard(overrides: Partial<A2AAgentCard> = {}): A2AAgentCard {
  return {
    name: overrides.name ?? 'Test Agent',
    description: overrides.description ?? 'A test A2A agent',
    url: overrides.url ?? 'http://localhost:9999',
    version: overrides.version ?? '1.0.0',
    capabilities: overrides.capabilities ?? { streaming: true },
    skills: overrides.skills ?? [{ id: 'echo', name: 'Echo', description: 'Echoes back your message' }],
    defaultInputModes: overrides.defaultInputModes ?? ['text'],
    defaultOutputModes: overrides.defaultOutputModes ?? ['text'],
  };
}

// ─── Legacy compat exports (used by old tests that may still exist) ───

/** @deprecated Use createDiscordMessageWithEmbed */
export function createA2UIContainer(title: string, description: string, _extra?: any[]): { components: any[]; rootId: string } {
  const msg = createDiscordMessageWithEmbed(title, description);
  return { components: [msg], rootId: msg.id };
}

/** @deprecated */
export function createA2UIButtonPair(label: string, actionName: string, variant?: string): any[] {
  return [{ id: a2uiId('btn'), component: 'DiscordButton', label, style: variant ?? 'primary', customId: actionName }];
}

/** @deprecated */
export function createA2UISelectMenu(options: { label: string; value: string; description?: string }[], id?: string): any {
  return { id: id ?? a2uiId('select'), component: 'DiscordSelectMenu', customId: 'test-select', options };
}

/** @deprecated */
export function createA2UIText(text: string, variant?: string, id?: string): any {
  return { id: id ?? a2uiId('text'), component: 'Text', text, variant };
}

/** @deprecated */
export function createA2UIImage(url: string, variant?: string, id?: string): any {
  return { id: id ?? a2uiId('img'), component: 'Image', url, variant };
}

/** @deprecated */
export function createA2UIDivider(id?: string): any {
  return { id: id ?? a2uiId('divider'), component: 'Divider' };
}

/** @deprecated */
export function createA2UIIcon(name: string, id?: string): any {
  return { id: id ?? a2uiId('icon'), component: 'Icon', name };
}

/** @deprecated */
export function createA2UITextField(label: string, textFieldType?: string, id?: string): any {
  return { id: id ?? a2uiId('input'), component: 'TextField', label, textFieldType };
}

/** @deprecated */
export function createA2UICheckBox(label: string, id?: string): any {
  return { id: id ?? a2uiId('checkbox'), component: 'CheckBox', label };
}

/** @deprecated */
export function buildA2UIPayload(cards: { components: any[]; rootId: string }[]): { version: string; components: any[] } {
  const allComponents: any[] = [];
  for (const card of cards) allComponents.push(...card.components);
  return { version: '0.9', components: allComponents };
}

/** @deprecated */
export function createA2UIMessage(payload: any, intent?: A2HIntent, extra?: Record<string, unknown>): A2AMessage {
  return { role: 'agent', parts: [{ type: 'data', data: { a2ui: payload } }], metadata: intent ? { intent, ...extra } : extra };
}
