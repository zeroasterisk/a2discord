/**
 * Mock A2A Server — a minimal HTTP server for testing.
 *
 * Works with both Node.js (vitest) and Bun runtimes.
 *
 * Usage:
 *   import { MockA2AServer } from './mock-a2a-server';
 *   const server = new MockA2AServer();
 *   await server.start(9999);
 *   // ... run tests ...
 *   await server.stop();
 *
 * Standalone: bun run tests/fixtures/mock-a2a-server.ts
 */

import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'http';
import {
  createAgentCard,
  createTask,
  createAgentMessage,
  echoTaskResponse,
  authorizeTaskResponse,
  collectTaskResponse,
  informTaskResponse,
  resultTaskResponse,
  failedTaskResponse,
  createStreamingEvents,
  createJsonRpcResponse,
  createJsonRpcError,
  createTaskId,
  createA2UIContainer,
  createA2UIButtonPair,
  createA2UISelectMenu,
  createA2UITextField,
  createA2UIText,
  createA2UIDivider,
  createA2UIImage,
  createA2UIIcon,
  createA2UICheckBox,
  createA2UIMessage,
  buildA2UIPayload,
  resetA2UICounter,
  type A2ATask,
  type A2AAgentCard,
} from '../helpers/a2a-fixtures';

export type ScenarioName =
  | 'echo'
  | 'authorize'
  | 'collect'
  | 'inform'
  | 'result'
  | 'error'
  | 'timeout'
  | 'streaming'
  | 'malformed'
  | 'a2ui-inform'
  | 'a2ui-authorize'
  | 'a2ui-collect'
  | 'a2ui-dashboard'
  | 'a2ui-kitchen-sink';

export type ScenarioHandler = (params: any) => A2ATask | Promise<A2ATask>;
export type StreamHandler = (params: any) => string[] | Promise<string[]>;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export class MockA2AServer {
  private server: Server | null = null;
  private port = 0;
  private agentCard: A2AAgentCard;
  private scenario: ScenarioName = 'echo';
  private customHandler: ScenarioHandler | null = null;
  private customStreamHandler: StreamHandler | null = null;
  private requestLog: { method: string; params: any; timestamp: number }[] = [];

  constructor(agentCard?: Partial<A2AAgentCard>) {
    this.agentCard = createAgentCard(agentCard);
  }

  setScenario(scenario: ScenarioName) {
    this.scenario = scenario;
    this.customHandler = null;
    this.customStreamHandler = null;
  }

  setCustomHandler(handler: ScenarioHandler) {
    this.customHandler = handler;
  }

  setCustomStreamHandler(handler: StreamHandler) {
    this.customStreamHandler = handler;
  }

  getRequestLog() {
    return this.requestLog;
  }

  clearRequestLog() {
    this.requestLog = [];
  }

  get url() {
    return this.port ? `http://localhost:${this.port}` : null;
  }

  async start(port = 0): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(port, () => {
        const addr = this.server!.address();
        this.port = typeof addr === 'object' && addr ? addr.port : port;
        this.agentCard.url = `http://localhost:${this.port}`;
        resolve(this.port);
      });
      this.server.on('error', reject);
    });
  }

  async stop() {
    return new Promise<void>((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
        this.server = null;
        this.port = 0;
      } else {
        resolve();
      }
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', `http://localhost:${this.port}`);

    // Agent card
    if (url.pathname === '/.well-known/agent.json' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.agentCard));
      return;
    }

    // JSON-RPC endpoint
    if (req.method === 'POST') {
      const raw = await readBody(req);
      let body: any;
      try {
        body = JSON.parse(raw);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(createJsonRpcError(-32700, 'Parse error')));
        return;
      }

      const { method, params, id } = body;
      this.requestLog.push({ method, params, timestamp: Date.now() });

      if (method === 'tasks/send') {
        const result = await this.handleTasksSend(params, id);
        if (typeof result === 'string') {
          // malformed scenario — return raw string
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(result);
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      if (method === 'tasks/sendSubscribe') {
        await this.handleTasksSendSubscribe(params, id, res);
        return;
      }

      if (method === 'tasks/get') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(createJsonRpcResponse(
          createTask({ id: params.id, status: { state: 'completed' } }), id
        )));
        return;
      }

      if (method === 'tasks/cancel') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(createJsonRpcResponse(
          createTask({ id: params.id, status: { state: 'canceled' } }), id
        )));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(createJsonRpcError(-32601, `Method not found: ${method}`, id)));
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  }

  private async handleTasksSend(params: any, rpcId: any): Promise<any> {
    if (this.customHandler) {
      const task = await this.customHandler(params);
      return createJsonRpcResponse(task, rpcId);
    }

    const userText = params.message?.parts?.[0]?.text ?? '';
    const taskId = params.id ?? createTaskId();

    switch (this.scenario) {
      case 'echo':
        return createJsonRpcResponse(echoTaskResponse(userText, taskId), rpcId);
      case 'authorize':
        return createJsonRpcResponse(authorizeTaskResponse('perform dangerous action', taskId), rpcId);
      case 'collect':
        return createJsonRpcResponse(collectTaskResponse([
          { name: 'name', label: 'Your Name', required: true },
          { name: 'email', label: 'Email Address', required: true },
        ], taskId), rpcId);
      case 'inform':
        return createJsonRpcResponse(informTaskResponse('Here is some important information.', taskId), rpcId);
      case 'result':
        return createJsonRpcResponse(resultTaskResponse('Task completed successfully.', taskId), rpcId);
      case 'error':
        return createJsonRpcResponse(failedTaskResponse('Something went wrong.', taskId), rpcId);
      case 'timeout':
        await new Promise((r) => setTimeout(r, 30000));
        return createJsonRpcResponse(echoTaskResponse(userText, taskId), rpcId);
      case 'malformed':
        return 'not json {{{';
      case 'a2ui-inform':
        return createJsonRpcResponse(this.a2uiInformTask(taskId), rpcId);
      case 'a2ui-authorize':
        return createJsonRpcResponse(this.a2uiAuthorizeTask(taskId), rpcId);
      case 'a2ui-collect':
        return createJsonRpcResponse(this.a2uiCollectTask(taskId), rpcId);
      case 'a2ui-dashboard':
        return createJsonRpcResponse(this.a2uiDashboardTask(taskId), rpcId);
      case 'a2ui-kitchen-sink':
        return createJsonRpcResponse(this.a2uiKitchenSinkTask(taskId), rpcId);
      default:
        return createJsonRpcResponse(echoTaskResponse(userText, taskId), rpcId);
    }
  }

  private async handleTasksSendSubscribe(params: any, rpcId: any, res: ServerResponse) {
    const taskId = params.id ?? createTaskId();
    const userText = params.message?.parts?.[0]?.text ?? '';

    let events: string[];

    if (this.customStreamHandler) {
      events = await this.customStreamHandler(params);
    } else if (this.scenario === 'error') {
      events = [`data: ${JSON.stringify(createJsonRpcError(-32000, 'Agent error', rpcId))}\n\n`];
    } else {
      const chunks = [`Echo: `, userText.slice(0, Math.ceil(userText.length / 2)), userText.slice(Math.ceil(userText.length / 2))];
      events = createStreamingEvents(taskId, chunks);
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    for (const event of events) {
      res.write(event);
      await new Promise((r) => setTimeout(r, 50));
    }
    res.end();
  }

  // ─── A2UI scenario builders ───

  private a2uiInformTask(taskId: string): A2ATask {
    resetA2UICounter();
    const card = createA2UIContainer('📊 Project Status', 'Everything is running smoothly.');
    const payload = buildA2UIPayload([card]);
    const msg = createA2UIMessage(payload, 'INFORM');
    return createTask({ id: taskId, status: { state: 'completed', message: msg } });
  }

  private a2uiAuthorizeTask(taskId: string): A2ATask {
    resetA2UICounter();
    const approveBtnComps = createA2UIButtonPair('✅ Approve', 'approve', 'success');
    const denyBtnComps = createA2UIButtonPair('❌ Deny', 'deny', 'danger');
    const card = createA2UIContainer('🔐 Deploy to Production?', 'This will push v0.2.0 to Cloud Run.', [...approveBtnComps, ...denyBtnComps]);
    const payload = buildA2UIPayload([card]);
    const msg = createA2UIMessage(payload, 'AUTHORIZE');
    return createTask({ id: taskId, status: { state: 'input-required', message: msg } });
  }

  private a2uiCollectTask(taskId: string): A2ATask {
    resetA2UICounter();
    const nameField = createA2UITextField('Project Name', 'shortText');
    const descField = createA2UITextField('Description', 'longText');
    const card = createA2UIContainer('📝 New Project', 'Please provide project details.', [nameField, descField]);
    const payload = buildA2UIPayload([card]);
    const msg = createA2UIMessage(payload, 'COLLECT');
    return createTask({ id: taskId, status: { state: 'input-required', message: msg } });
  }

  private a2uiDashboardTask(taskId: string): A2ATask {
    resetA2UICounter();
    const emailCard = createA2UIContainer('📧 Unread Emails (3)', 'team@google.com: ADK v1.2 release planning');
    const calCard = createA2UIContainer('📅 Upcoming', '14:00 — 1:1 with PM\n15:30 — Sprint Review');
    const payload = buildA2UIPayload([emailCard, calCard]);
    const msg = createA2UIMessage(payload, 'INFORM');
    return createTask({ id: taskId, status: { state: 'completed', message: msg } });
  }

  private a2uiKitchenSinkTask(taskId: string): A2ATask {
    resetA2UICounter();
    const icon = createA2UIIcon('star');
    const divider = createA2UIDivider();
    const image = createA2UIImage('https://github.com/zeroasterisk.png', 'thumbnail');
    const checkbox = createA2UICheckBox('I agree to terms');
    const select = createA2UISelectMenu([
      { label: 'Option A', value: 'a' },
      { label: 'Option B', value: 'b' },
      { label: 'Option C', value: 'c' },
    ]);
    const btnComps = createA2UIButtonPair('Submit', 'submit', 'primary');
    const card = createA2UIContainer(
      '🍳 Kitchen Sink',
      '**Bold**, *italic*, `code` — all A2UI component types.',
      [icon, divider, image, checkbox, select, ...btnComps],
    );
    const payload = buildA2UIPayload([card]);
    const msg = createA2UIMessage(payload, 'INFORM');
    return createTask({ id: taskId, status: { state: 'completed', message: msg } });
  }
}

// ─── Standalone mode ───
const isMain = process.argv[1]?.endsWith('mock-a2a-server.ts') || process.argv[1]?.endsWith('mock-a2a-server.js');
if (isMain) {
  const port = parseInt(process.argv[2] ?? '9999', 10);
  const server = new MockA2AServer();
  server.start(port).then((p) => {
    console.log(`Mock A2A server running at http://localhost:${p}`);
    console.log('Scenarios: echo (default), authorize, collect, inform, result, error, streaming');
  });
}
