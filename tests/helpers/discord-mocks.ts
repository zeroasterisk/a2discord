/**
 * Discord.js mock factories for testing.
 * Creates minimal mock objects that satisfy the interfaces used by a2discord.
 */

import { EventEmitter } from 'events';
import type {
  Client,
  Message,
  TextChannel,
  Guild,
  User,
  GuildMember,
  ButtonInteraction,
  ModalSubmitInteraction,
  ThreadChannel,
  Collection,
} from 'discord.js';

// ─── Client ───

export interface MockClientOptions {
  botId?: string;
  botUsername?: string;
  guilds?: Partial<ReturnType<typeof createMockGuild>>[];
}

export function createMockClient(opts: MockClientOptions = {}): Client & EventEmitter {
  const emitter = new EventEmitter();
  const client = Object.assign(emitter, {
    user: {
      id: opts.botId ?? '100000000000000000',
      username: opts.botUsername ?? 'test-bot',
      bot: true,
      tag: `${opts.botUsername ?? 'test-bot'}#0000`,
    },
    guilds: {
      cache: new Map(
        (opts.guilds ?? [createMockGuild()]).map((g) => [g.id, g])
      ),
    },
    channels: {
      cache: new Map(),
      fetch: async (id: string) => null,
    },
    login: async (_token: string) => 'mock-token',
    destroy: async () => {},
    isReady: () => true,
    ws: { ping: 42 },
    rest: { setToken: () => {} },
    options: { intents: [] },
    application: { id: opts.botId ?? '100000000000000000' },
  }) as unknown as Client & EventEmitter;

  return client;
}

// ─── Guild ───

export interface MockGuildOptions {
  id?: string;
  name?: string;
}

export function createMockGuild(opts: MockGuildOptions = {}) {
  return {
    id: opts.id ?? '200000000000000000',
    name: opts.name ?? 'Test Guild',
    members: {
      cache: new Map(),
      fetch: async () => new Map(),
    },
    channels: {
      cache: new Map(),
      create: async (options: any) => createMockTextChannel({ name: options.name }),
    },
    roles: { cache: new Map() },
  };
}

// ─── Channel ───

export interface MockTextChannelOptions {
  id?: string;
  name?: string;
  guildId?: string;
  messages?: Message[];
}

export function createMockTextChannel(opts: MockTextChannelOptions = {}) {
  const sentMessages: any[] = [];
  const channel = {
    id: opts.id ?? '300000000000000000',
    name: opts.name ?? 'test-channel',
    guildId: opts.guildId ?? '200000000000000000',
    type: 0, // GuildText
    isTextBased: () => true,
    send: async (content: any) => {
      const msg = createMockMessage({
        content: typeof content === 'string' ? content : content.content,
        channelId: channel.id,
        author: { id: '100000000000000000', username: 'test-bot', bot: true },
      });
      sentMessages.push(msg);
      return msg;
    },
    threads: {
      create: async (options: any) =>
        createMockThread({
          name: options.name,
          parentId: channel.id,
        }),
    },
    messages: {
      fetch: async () => new Map(),
    },
    // Test helper
    _sentMessages: sentMessages,
  };
  return channel;
}

// ─── Thread ───

export interface MockThreadOptions {
  id?: string;
  name?: string;
  parentId?: string;
}

export function createMockThread(opts: MockThreadOptions = {}) {
  const sentMessages: any[] = [];
  return {
    id: opts.id ?? '400000000000000000',
    name: opts.name ?? 'test-thread',
    parentId: opts.parentId ?? '300000000000000000',
    type: 11, // PublicThread
    isThread: () => true,
    isTextBased: () => true,
    send: async (content: any) => {
      const msg = createMockMessage({
        content: typeof content === 'string' ? content : content.content,
        channelId: opts.id ?? '400000000000000000',
      });
      sentMessages.push(msg);
      return msg;
    },
    setArchived: async (archived: boolean) => {},
    setName: async (name: string) => {},
    messages: { fetch: async () => new Map() },
    _sentMessages: sentMessages,
  };
}

// ─── User ───

export interface MockUserOptions {
  id?: string;
  username?: string;
  bot?: boolean;
}

export function createMockUser(opts: MockUserOptions = {}): Partial<User> {
  return {
    id: opts.id ?? '500000000000000000',
    username: opts.username ?? 'test-user',
    bot: opts.bot ?? false,
    tag: `${opts.username ?? 'test-user'}#1234`,
  } as Partial<User>;
}

// ─── Message ───

export interface MockMessageOptions {
  id?: string;
  content?: string;
  channelId?: string;
  author?: Partial<User> | { id: string; username: string; bot?: boolean };
  embeds?: any[];
  components?: any[];
}

export function createMockMessage(opts: MockMessageOptions = {}) {
  const author = opts.author ?? createMockUser();
  let editedContent: string | undefined;
  let editedEmbeds: any[] | undefined;
  let editedComponents: any[] | undefined;

  const msg = {
    id: opts.id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content: opts.content ?? '',
    channelId: opts.channelId ?? '300000000000000000',
    author,
    embeds: opts.embeds ?? [],
    components: opts.components ?? [],
    createdTimestamp: Date.now(),
    reply: async (content: any) =>
      createMockMessage({
        content: typeof content === 'string' ? content : content.content,
        channelId: msg.channelId,
      }),
    edit: async (content: any) => {
      if (typeof content === 'string') {
        editedContent = content;
      } else {
        editedContent = content.content;
        editedEmbeds = content.embeds;
        editedComponents = content.components;
      }
      return msg;
    },
    delete: async () => {},
    react: async (emoji: string) => {},
    get editedAt() {
      return editedContent !== undefined ? new Date() : null;
    },
    // Test helpers
    get _editedContent() { return editedContent; },
    get _editedEmbeds() { return editedEmbeds; },
    get _editedComponents() { return editedComponents; },
  };
  return msg;
}

// ─── Interactions ───

export interface MockButtonInteractionOptions {
  customId?: string;
  userId?: string;
  messageId?: string;
  channelId?: string;
}

export function createMockButtonInteraction(opts: MockButtonInteractionOptions = {}) {
  let replied = false;
  let deferred = false;
  let replyContent: any = null;
  let updatedMessage: any = null;

  return {
    type: 3, // MessageComponent
    componentType: 2, // Button
    customId: opts.customId ?? 'test-button',
    user: createMockUser({ id: opts.userId }),
    message: createMockMessage({ id: opts.messageId }),
    channelId: opts.channelId ?? '300000000000000000',
    replied,
    deferred,
    isButton: () => true,
    deferReply: async (opts?: any) => { deferred = true; },
    deferUpdate: async () => { deferred = true; },
    reply: async (content: any) => { replied = true; replyContent = content; },
    editReply: async (content: any) => { replyContent = content; },
    update: async (content: any) => { updatedMessage = content; },
    followUp: async (content: any) => createMockMessage({ content: typeof content === 'string' ? content : content.content }),
    // Test helpers
    get _replyContent() { return replyContent; },
    get _updatedMessage() { return updatedMessage; },
  };
}

export interface MockModalSubmitOptions {
  customId?: string;
  userId?: string;
  fields?: Record<string, string>;
}

export function createMockModalSubmit(opts: MockModalSubmitOptions = {}) {
  const fields = opts.fields ?? {};
  let replied = false;
  let replyContent: any = null;

  return {
    type: 5, // ModalSubmit
    customId: opts.customId ?? 'test-modal',
    user: createMockUser({ id: opts.userId }),
    fields: {
      getTextInputValue: (id: string) => fields[id] ?? '',
      getField: (id: string) => ({ value: fields[id] ?? '' }),
    },
    isModalSubmit: () => true,
    deferReply: async () => {},
    reply: async (content: any) => { replied = true; replyContent = content; },
    editReply: async (content: any) => { replyContent = content; },
    // Test helpers
    get _replied() { return replied; },
    get _replyContent() { return replyContent; },
  };
}
