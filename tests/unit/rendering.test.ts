/**
 * Unit tests for rendering layer — A2A/A2UI → Discord components.
 */

import { describe, it, expect } from 'vitest';
import { DiscordRenderer } from '../../src/rendering/index';
import type { A2AMessage } from '../../src/types';
import {
  createAgentMessage,
  createTextPart,
  createDataPart,
  createFilePart,
  informTaskResponse,
  authorizeTaskResponse,
  collectTaskResponse,
  resultTaskResponse,
} from '../helpers/a2a-fixtures';

const renderer = new DiscordRenderer();

function makeMsg(text: string, metadata?: Record<string, unknown>): A2AMessage {
  return { role: 'agent', parts: [{ type: 'text', text }], metadata };
}

function makeMultiPartMsg(parts: A2AMessage['parts'], metadata?: Record<string, unknown>): A2AMessage {
  return { role: 'agent', parts, metadata };
}

describe('Rendering: A2A → Discord', () => {
  describe('text parts', () => {
    it('should render text part as message content', () => {
      const result = renderer.render(makeMsg('Hello world'));
      expect(result.content).toBe('Hello world');
    });

    it('should render markdown in text parts', () => {
      const result = renderer.render(makeMsg('**bold** and _italic_'));
      expect(result.content).toBe('**bold** and _italic_');
    });

    it('should truncate text exceeding Discord 2000 char limit into embed', () => {
      const longText = 'x'.repeat(2500);
      const result = renderer.render(makeMsg(longText));
      // Long text goes to embed instead of content
      expect(result.embeds).toBeDefined();
      expect(result.embeds!.length).toBe(1);
      expect(result.content).toBeUndefined();
    });

    it('should handle multiple text parts joined', () => {
      const msg = makeMultiPartMsg([
        { type: 'text', text: 'Line 1' },
        { type: 'text', text: 'Line 2' },
      ]);
      const result = renderer.render(msg);
      expect(result.content).toBe('Line 1\nLine 2');
    });
  });

  describe('data parts', () => {
    it('should render data part as code block in embed', () => {
      const msg = makeMultiPartMsg([
        { type: 'data', data: { key: 'value' } },
      ]);
      const result = renderer.render(msg);
      expect(result.embeds).toBeDefined();
      expect(result.embeds!.length).toBe(1);
    });

    it('should format JSON data prettily', () => {
      const msg = makeMultiPartMsg([
        { type: 'data', data: { name: 'test', count: 42 } },
      ]);
      const result = renderer.render(msg);
      expect(result.embeds).toBeDefined();
      const embed = result.embeds![0] as any;
      const fields = embed.data?.fields ?? embed.fields ?? [];
      const dataField = fields.find((f: any) => f.name === 'Data');
      expect(dataField).toBeDefined();
      expect(dataField.value).toContain('json');
    });

    it('should handle nested data structures', () => {
      const msg = makeMultiPartMsg([
        { type: 'data', data: { nested: { deep: { value: true } } } },
      ]);
      const result = renderer.render(msg);
      expect(result.embeds).toBeDefined();
    });
  });

  describe('file parts', () => {
    it('should render file part without crashing', () => {
      const msg = makeMultiPartMsg([
        { type: 'file', file: { name: 'test.txt', mimeType: 'text/plain', uri: 'https://example.com/test.txt' } },
      ]);
      // File parts are not text/data, so extractText returns empty
      const result = renderer.render(msg);
      expect(result).toBeDefined();
    });

    it('should handle mixed text and file parts', () => {
      const msg = makeMultiPartMsg([
        { type: 'text', text: 'Here is a file' },
        { type: 'file', file: { name: 'doc.pdf', mimeType: 'application/pdf' } },
      ]);
      const result = renderer.render(msg);
      expect(result.content).toBe('Here is a file');
    });

    it('should handle file URIs and base64 bytes', () => {
      const msg = makeMultiPartMsg([
        { type: 'file', file: { name: 'img.png', mimeType: 'image/png', bytes: 'iVBORw0KGgo=' } },
      ]);
      const result = renderer.render(msg);
      expect(result).toBeDefined();
    });
  });

  describe('INFORM → embed', () => {
    it('should have correct fixture shape', () => {
      const task = informTaskResponse('Test info');
      expect(task).toHaveIntent('INFORM');
      expect(task).toBeInState('completed');
      expect(task.status.message?.parts[0].text).toBe('Test info');
    });

    it('should render INFORM message as Discord embed', () => {
      const msg = makeMsg('Important update', { intent: 'INFORM' });
      const result = renderer.render(msg);
      expect(result.embeds).toBeDefined();
      expect(result.embeds!.length).toBe(1);
    });

    it('should set embed color for informational messages', () => {
      const msg = makeMsg('Info here', { intent: 'INFORM' });
      const result = renderer.render(msg);
      const embed = result.embeds![0] as any;
      const color = embed.data?.color ?? embed.color;
      expect(color).toBe(0x3498db); // COLOR_BLUE
    });

    it('should include structured data fields in embed', () => {
      const msg = makeMsg('Info', { intent: 'INFORM', source: 'system', priority: 'high' });
      const result = renderer.render(msg);
      const embed = result.embeds![0] as any;
      const fields = embed.data?.fields ?? embed.fields ?? [];
      expect(fields.some((f: any) => f.name === 'source')).toBe(true);
      expect(fields.some((f: any) => f.name === 'priority')).toBe(true);
    });
  });

  describe('AUTHORIZE → buttons', () => {
    it('should have correct fixture shape', () => {
      const task = authorizeTaskResponse('delete database');
      expect(task).toHaveIntent('AUTHORIZE');
      expect(task).toBeInState('input-required');
      expect(task.status.message?.metadata?.action).toBe('delete database');
    });

    it('should render AUTHORIZE as embed + button row', () => {
      const msg = makeMsg('Approve this?', {
        intent: 'AUTHORIZE',
        action: 'delete records',
        buttons: ['approve', 'deny'],
      });
      const result = renderer.render(msg);
      expect(result.embeds).toBeDefined();
      expect(result.embeds!.length).toBe(1);
      expect(result.components).toBeDefined();
      expect(result.components!.length).toBe(1);
    });

    it('should include approve and deny buttons', () => {
      const msg = makeMsg('Approve?', {
        intent: 'AUTHORIZE',
        action: 'do something',
        buttons: ['approve', 'deny'],
      });
      const result = renderer.render(msg);
      const row = result.components![0] as any;
      const components = row.components ?? row.data?.components ?? [];
      expect(components.length).toBe(2);
      const ids = components.map((c: any) => c.data?.custom_id ?? c.custom_id ?? c.customId);
      expect(ids).toContain('a2discord-approve');
      expect(ids).toContain('a2discord-deny');
    });

    it('should show action details in embed', () => {
      const msg = makeMsg('Approve?', {
        intent: 'AUTHORIZE',
        action: 'deploy to production',
        buttons: ['approve', 'deny'],
      });
      const result = renderer.render(msg);
      const embed = result.embeds![0] as any;
      const fields = embed.data?.fields ?? embed.fields ?? [];
      const actionField = fields.find((f: any) => f.name === 'Action');
      expect(actionField).toBeDefined();
      expect(actionField.value).toBe('deploy to production');
    });

    it('should use default buttons when none specified', () => {
      const msg = makeMsg('Approve?', { intent: 'AUTHORIZE', action: 'test' });
      const result = renderer.render(msg);
      expect(result.components).toBeDefined();
      expect(result.components!.length).toBe(1);
    });
  });

  describe('COLLECT → modal', () => {
    it('should have correct fixture shape', () => {
      const task = collectTaskResponse([
        { name: 'name', label: 'Name', required: true },
        { name: 'email', label: 'Email' },
      ]);
      expect(task).toHaveIntent('COLLECT');
      expect(task).toBeInState('input-required');
      const schema = task.status.message?.metadata?.schema as any;
      expect(schema.fields).toHaveLength(2);
    });

    it('should render COLLECT with "Provide Info" button', () => {
      const msg = makeMsg('Please fill out:', {
        intent: 'COLLECT',
        schema: {
          fields: [
            { name: 'name', label: 'Name', required: true },
          ],
        },
      });
      const result = renderer.render(msg);
      expect(result.embeds).toBeDefined();
      expect(result.components).toBeDefined();
      const row = result.components![0] as any;
      const components = row.components ?? row.data?.components ?? [];
      const ids = components.map((c: any) => c.data?.custom_id ?? c.custom_id ?? c.customId);
      expect(ids).toContain('a2discord-collect-respond');
    });

    it('should show schema fields in embed', () => {
      const msg = makeMsg('Input needed:', {
        intent: 'COLLECT',
        schema: {
          fields: [
            { name: 'name', label: 'Full Name', required: true },
            { name: 'email', label: 'Email Address' },
          ],
        },
      });
      const result = renderer.render(msg);
      const embed = result.embeds![0] as any;
      const fields = embed.data?.fields ?? embed.fields ?? [];
      expect(fields.some((f: any) => f.name === 'Full Name')).toBe(true);
      expect(fields.some((f: any) => f.name === 'Email Address')).toBe(true);
    });

    it('should mark required vs optional fields', () => {
      const msg = makeMsg('Input needed:', {
        intent: 'COLLECT',
        schema: {
          fields: [
            { name: 'name', label: 'Name', required: true },
            { name: 'bio', label: 'Bio' },
          ],
        },
      });
      const result = renderer.render(msg);
      const embed = result.embeds![0] as any;
      const fields = embed.data?.fields ?? embed.fields ?? [];
      const nameField = fields.find((f: any) => f.name === 'Name');
      const bioField = fields.find((f: any) => f.name === 'Bio');
      expect(nameField.value).toContain('required');
      expect(bioField.value).toContain('optional');
    });

    it('should handle up to 25 fields (Discord embed limit)', () => {
      const schemaFields = Array.from({ length: 30 }, (_, i) => ({
        name: `field${i}`,
        label: `Field ${i}`,
      }));
      const msg = makeMsg('Many fields:', {
        intent: 'COLLECT',
        schema: { fields: schemaFields },
      });
      const result = renderer.render(msg);
      const embed = result.embeds![0] as any;
      const fields = embed.data?.fields ?? embed.fields ?? [];
      expect(fields.length).toBeLessThanOrEqual(25);
    });
  });

  describe('RESULT → edit', () => {
    it('should have correct fixture shape', () => {
      const task = resultTaskResponse('All done!');
      expect(task).toHaveIntent('RESULT');
      expect(task).toBeInState('completed');
    });

    it('should render success result with green color', () => {
      const msg = makeMsg('Success!', { intent: 'RESULT', success: true });
      const result = renderer.render(msg);
      expect(result.embeds).toBeDefined();
      const embed = result.embeds![0] as any;
      const color = embed.data?.color ?? embed.color;
      expect(color).toBe(0x2ecc71); // COLOR_GREEN
    });

    it('should render failure result with red color', () => {
      const msg = makeMsg('Failed!', { intent: 'RESULT', success: false });
      const result = renderer.render(msg);
      expect(result.embeds).toBeDefined();
      const embed = result.embeds![0] as any;
      const color = embed.data?.color ?? embed.color;
      expect(color).toBe(0xe74c3c); // COLOR_RED
    });

    it('should show success/failure indicator in title', () => {
      const successMsg = makeMsg('Done', { intent: 'RESULT', success: true });
      const failMsg = makeMsg('Oops', { intent: 'RESULT', success: false });
      const successResult = renderer.render(successMsg);
      const failResult = renderer.render(failMsg);
      const successEmbed = successResult.embeds![0] as any;
      const failEmbed = failResult.embeds![0] as any;
      expect(successEmbed.data?.title ?? successEmbed.title).toContain('✅');
      expect(failEmbed.data?.title ?? failEmbed.title).toContain('❌');
    });
  });

  describe('error rendering', () => {
    it('should render error embed with red color', () => {
      const embed = renderer.renderError(new Error('Something broke'));
      const data = (embed as any).data ?? embed;
      expect(data.color).toBe(0xe74c3c);
    });

    it('should include error message in description', () => {
      const embed = renderer.renderError(new Error('Connection failed'));
      const data = (embed as any).data ?? embed;
      expect(data.description).toContain('Connection failed');
    });

    it('should truncate very long error messages', () => {
      const embed = renderer.renderError(new Error('x'.repeat(5000)));
      const data = (embed as any).data ?? embed;
      expect(data.description.length).toBeLessThanOrEqual(4096);
    });
  });

  describe('button rendering', () => {
    it('should render action buttons with correct IDs', () => {
      const row = renderer.renderButtons(['approve', 'deny']);
      const components = (row as any).components ?? (row as any).data?.components ?? [];
      expect(components.length).toBe(2);
    });

    it('should use Success style for approve button', () => {
      const row = renderer.renderButtons(['approve']);
      const components = (row as any).components ?? (row as any).data?.components ?? [];
      // ButtonStyle.Success = 3
      const style = components[0].data?.style ?? components[0].style;
      expect(style).toBe(3); // ButtonStyle.Success
    });

    it('should use Danger style for non-approve buttons', () => {
      const row = renderer.renderButtons(['deny']);
      const components = (row as any).components ?? (row as any).data?.components ?? [];
      const style = components[0].data?.style ?? components[0].style;
      expect(style).toBe(4); // ButtonStyle.Danger
    });

    it('should capitalize button labels', () => {
      const row = renderer.renderButtons(['approve']);
      const components = (row as any).components ?? (row as any).data?.components ?? [];
      const label = components[0].data?.label ?? components[0].label;
      expect(label).toBe('Approve');
    });
  });
});
