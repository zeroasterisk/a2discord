/**
 * A2A protocol fixtures — JSON-RPC 2.0 envelopes, tasks, messages, parts.
 * Matches the A2A spec for proper task lifecycle testing.
 */

// ─── Types ───

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
  capabilities: {
    streaming?: boolean;
    pushNotifications?: boolean;
  };
  skills: { id: string; name: string; description: string }[];
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
}

// ─── A2H Intent metadata keys ───

export type A2HIntent = 'INFORM' | 'COLLECT' | 'AUTHORIZE' | 'ESCALATE' | 'RESULT';

// ─── Factories ───

let taskCounter = 0;

export function createTaskId(): string {
  return `task-${++taskCounter}-${Date.now()}`;
}

export function resetTaskCounter() {
  taskCounter = 0;
}

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

// ─── JSON-RPC Envelopes ───

export function createJsonRpcRequest(method: string, params: Record<string, unknown>, id?: string | number) {
  return {
    jsonrpc: '2.0' as const,
    id: id ?? 1,
    method,
    params,
  };
}

export function createJsonRpcResponse(result: unknown, id?: string | number) {
  return {
    jsonrpc: '2.0' as const,
    id: id ?? 1,
    result,
  };
}

export function createJsonRpcError(code: number, message: string, id?: string | number, data?: unknown) {
  return {
    jsonrpc: '2.0' as const,
    id: id ?? 1,
    error: { code, message, data },
  };
}

// ─── Canned Scenarios ───

/** Simple text echo response */
export function echoTaskResponse(userText: string, taskId?: string): A2ATask {
  const id = taskId ?? createTaskId();
  return createTask({
    id,
    status: { state: 'completed', message: createAgentMessage(`Echo: ${userText}`) },
    history: [createUserMessage(userText), createAgentMessage(`Echo: ${userText}`)],
  });
}

/** AUTHORIZE intent — agent asks for approval */
export function authorizeTaskResponse(action: string, taskId?: string): A2ATask {
  const id = taskId ?? createTaskId();
  return createTask({
    id,
    status: {
      state: 'input-required',
      message: createAgentMessage(`Requesting approval to: ${action}`, 'AUTHORIZE', {
        action,
        buttons: ['approve', 'deny'],
      }),
    },
  });
}

/** COLLECT intent — agent asks for structured input */
export function collectTaskResponse(fields: { name: string; label: string; required?: boolean }[], taskId?: string): A2ATask {
  const id = taskId ?? createTaskId();
  return createTask({
    id,
    status: {
      state: 'input-required',
      message: createAgentMessage('Please provide the following information:', 'COLLECT', {
        schema: { fields },
      }),
    },
  });
}

/** INFORM intent — agent shares info */
export function informTaskResponse(info: string, taskId?: string): A2ATask {
  const id = taskId ?? createTaskId();
  return createTask({
    id,
    status: {
      state: 'completed',
      message: createAgentMessage(info, 'INFORM'),
    },
  });
}

/** RESULT intent — final outcome */
export function resultTaskResponse(outcome: string, taskId?: string): A2ATask {
  const id = taskId ?? createTaskId();
  return createTask({
    id,
    status: {
      state: 'completed',
      message: createAgentMessage(outcome, 'RESULT', { success: true }),
    },
  });
}

/** Failed task */
export function failedTaskResponse(error: string, taskId?: string): A2ATask {
  const id = taskId ?? createTaskId();
  return createTask({
    id,
    status: {
      state: 'failed',
      message: createAgentMessage(error),
    },
  });
}

/** Streaming SSE events for tasks/sendSubscribe */
export function createStreamingEvents(taskId: string, chunks: string[]): string[] {
  const events: string[] = [];

  // Working status
  events.push(
    `data: ${JSON.stringify({
      jsonrpc: '2.0',
      method: 'tasks/status',
      params: { id: taskId, status: { state: 'working' }, final: false },
    })}\n\n`
  );

  // Artifact chunks
  for (let i = 0; i < chunks.length; i++) {
    events.push(
      `data: ${JSON.stringify({
        jsonrpc: '2.0',
        method: 'tasks/artifact',
        params: {
          id: taskId,
          artifact: { parts: [{ type: 'text', text: chunks[i] }], append: i > 0 },
        },
      })}\n\n`
    );
  }

  // Completed status
  events.push(
    `data: ${JSON.stringify({
      jsonrpc: '2.0',
      method: 'tasks/status',
      params: {
        id: taskId,
        status: { state: 'completed', message: createAgentMessage(chunks.join('')) },
        final: true,
      },
    })}\n\n`
  );

  return events;
}

// ─── A2UI Component Factories ───

export interface A2UIComponent {
  id: string;
  component: string;
  [key: string]: unknown;
}

let a2uiCounter = 0;

function a2uiId(prefix: string): string {
  return `${prefix}-${++a2uiCounter}`;
}

export function resetA2UICounter() {
  a2uiCounter = 0;
}

export function createA2UIText(text: string, variant?: string, id?: string): A2UIComponent {
  return { id: id ?? a2uiId('text'), component: 'Text', text, ...(variant ? { variant } : {}) };
}

export function createA2UIButton(label: string, actionName: string, variant?: string, id?: string): A2UIComponent {
  const textId = a2uiId('btn-label');
  const btnId = id ?? a2uiId('btn');
  return [
    { id: textId, component: 'Text', text: label },
    { id: btnId, component: 'Button', child: textId, variant: variant ?? 'primary', action: { event: { name: actionName } } },
  ] as any; // Returns array — caller must spread into components
}

export function createA2UIButtonPair(label: string, actionName: string, variant?: string): A2UIComponent[] {
  const textId = a2uiId('btn-label');
  const btnId = a2uiId('btn');
  return [
    { id: textId, component: 'Text', text: label },
    { id: btnId, component: 'Button', child: textId, variant: variant ?? 'primary', action: { event: { name: actionName } } },
  ];
}

export function createA2UIContainer(title: string, description: string, extraChildren?: A2UIComponent[]): { components: A2UIComponent[]; rootId: string } {
  const titleId = a2uiId('title');
  const bodyId = a2uiId('body');
  const contentId = a2uiId('content');
  const cardId = a2uiId('card');

  const childIds = [titleId, bodyId, ...(extraChildren?.map(c => c.id) ?? [])];
  const components: A2UIComponent[] = [
    { id: titleId, component: 'Text', text: title, variant: 'h1' },
    { id: bodyId, component: 'Text', text: description, variant: 'body' },
    ...(extraChildren ?? []),
    { id: contentId, component: 'Column', children: childIds },
    { id: cardId, component: 'Card', child: contentId },
  ];

  return { components, rootId: cardId };
}

export function createA2UISection(title: string, content: string, id?: string): A2UIComponent[] {
  const titleId = a2uiId('section-title');
  const bodyId = a2uiId('section-body');
  const colId = id ?? a2uiId('section');
  return [
    { id: titleId, component: 'Text', text: title, variant: 'h3' },
    { id: bodyId, component: 'Text', text: content, variant: 'body' },
    { id: colId, component: 'Column', children: [titleId, bodyId] },
  ];
}

export function createA2UISelectMenu(
  options: { label: string; value: string; description?: string }[],
  id?: string,
): A2UIComponent {
  return {
    id: id ?? a2uiId('select'),
    component: 'ChoicePicker',
    options,
    maxAllowedSelections: 1,
  };
}

export function createA2UIImage(url: string, variant?: string, id?: string): A2UIComponent {
  return { id: id ?? a2uiId('img'), component: 'Image', url, ...(variant ? { variant } : {}) };
}

export function createA2UIDivider(id?: string): A2UIComponent {
  return { id: id ?? a2uiId('divider'), component: 'Divider', axis: 'horizontal' };
}

export function createA2UIIcon(name: string, id?: string): A2UIComponent {
  return { id: id ?? a2uiId('icon'), component: 'Icon', name };
}

export function createA2UITextField(label: string, textFieldType?: string, id?: string): A2UIComponent {
  return { id: id ?? a2uiId('input'), component: 'TextField', label, textFieldType: textFieldType ?? 'shortText' };
}

export function createA2UICheckBox(label: string, id?: string): A2UIComponent {
  return { id: id ?? a2uiId('checkbox'), component: 'CheckBox', label };
}

/**
 * Build a full A2UI payload with root component wrapping the given card IDs.
 */
export function buildA2UIPayload(cards: { components: A2UIComponent[]; rootId: string }[]): { version: string; components: A2UIComponent[] } {
  const allComponents: A2UIComponent[] = [];
  const rootChildren: string[] = [];

  for (const card of cards) {
    allComponents.push(...card.components);
    rootChildren.push(card.rootId);
  }

  allComponents.push({ id: 'root', component: 'Column', children: rootChildren });

  return { version: '0.9', components: allComponents };
}

/**
 * Wrap an A2UI payload into an A2A message data part.
 */
export function createA2UIMessage(
  payload: { version: string; components: A2UIComponent[] },
  intent?: A2HIntent,
  extra?: Record<string, unknown>,
): A2AMessage {
  const metadata = intent ? { intent, ...extra } : extra;
  return {
    role: 'agent',
    parts: [{ type: 'data', data: { a2ui: payload } }],
    metadata,
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
    skills: overrides.skills ?? [
      { id: 'echo', name: 'Echo', description: 'Echoes back your message' },
    ],
    defaultInputModes: overrides.defaultInputModes ?? ['text'],
    defaultOutputModes: overrides.defaultOutputModes ?? ['text'],
  };
}
