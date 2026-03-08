/**
 * Custom vitest matchers for a2discord testing.
 */

import { expect } from 'vitest';
import type { A2ATask, A2HIntent } from './a2a-fixtures';

interface CustomMatchers<R = unknown> {
  toHaveIntent(intent: A2HIntent): R;
  toBeInState(state: string): R;
  toHaveEmbedWithTitle(title: string): R;
  toHaveButtonWithId(customId: string): R;
  toHaveTextContent(text: string): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
  toHaveIntent(task: A2ATask, intent: A2HIntent) {
    const actualIntent = task.status?.message?.metadata?.intent;
    return {
      pass: actualIntent === intent,
      message: () =>
        `Expected task to have intent "${intent}", got "${actualIntent ?? 'none'}"`,
    };
  },

  toBeInState(task: A2ATask, state: string) {
    return {
      pass: task.status?.state === state,
      message: () =>
        `Expected task to be in state "${state}", got "${task.status?.state}"`,
    };
  },

  toHaveEmbedWithTitle(message: any, title: string) {
    const embeds = message.embeds ?? message._editedEmbeds ?? [];
    const found = embeds.some((e: any) => e.title === title || e.data?.title === title);
    return {
      pass: found,
      message: () =>
        `Expected message to have embed with title "${title}", found: ${embeds.map((e: any) => e.title ?? e.data?.title).join(', ') || 'none'}`,
    };
  },

  toHaveButtonWithId(message: any, customId: string) {
    const components = message.components ?? message._editedComponents ?? [];
    const buttons = components.flatMap((row: any) =>
      (row.components ?? []).filter((c: any) => c.customId === customId || c.custom_id === customId)
    );
    return {
      pass: buttons.length > 0,
      message: () =>
        `Expected message to have button with customId "${customId}"`,
    };
  },

  toHaveTextContent(message: any, text: string) {
    const content = message.content ?? message._editedContent ?? '';
    return {
      pass: content.includes(text),
      message: () =>
        `Expected message to contain "${text}", got "${content}"`,
    };
  },
});
