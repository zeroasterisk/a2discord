/**
 * Unit tests for A2UI → Discord renderer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { A2UIRenderer, type A2UIComponent } from '../../src/rendering/a2ui-renderer';
import {
  createA2UIContainer,
  createA2UIButtonPair,
  createA2UISelectMenu,
  createA2UIText,
  createA2UIDivider,
  createA2UIImage,
  createA2UIIcon,
  createA2UITextField,
  createA2UICheckBox,
  buildA2UIPayload,
  resetA2UICounter,
} from '../helpers/a2a-fixtures';

let renderer: A2UIRenderer;

beforeEach(() => {
  renderer = new A2UIRenderer();
  resetA2UICounter();
});

function embedData(result: any, idx = 0): any {
  return result.embeds?.[idx]?.data ?? result.embeds?.[idx] ?? {};
}

function componentData(result: any, rowIdx = 0): any[] {
  const row = result.components?.[rowIdx] as any;
  return row?.components ?? row?.data?.components ?? [];
}

describe('A2UI Renderer', () => {
  describe('Container → Embed', () => {
    it('should render a Card as an embed with title and description', () => {
      const card = createA2UIContainer('Hello', 'World');
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components);
      expect(result.embeds).toBeDefined();
      expect(result.embeds!.length).toBeGreaterThanOrEqual(1);
      // Find the card embed (not the root)
      const cardEmbed = result.embeds!.find((e: any) => {
        const d = (e as any).data ?? e;
        return d.title === 'Hello';
      });
      expect(cardEmbed).toBeDefined();
      const d = (cardEmbed as any).data ?? cardEmbed;
      expect(d.description).toContain('World');
    });

    it('should render multiple Cards as multiple embeds', () => {
      const card1 = createA2UIContainer('Card 1', 'Body 1');
      const card2 = createA2UIContainer('Card 2', 'Body 2');
      const payload = buildA2UIPayload([card1, card2]);
      const result = renderer.render(payload.components);
      expect(result.embeds!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Text → content/embed parts', () => {
    it('should render h1 Text as embed title', () => {
      const card = createA2UIContainer('My Title', 'My body');
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components);
      const titles = result.embeds!.map((e: any) => (e as any).data?.title ?? '');
      expect(titles).toContain('My Title');
    });

    it('should render body Text as embed description', () => {
      const card = createA2UIContainer('Title', 'Description text here');
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components);
      const descs = result.embeds!.map((e: any) => (e as any).data?.description ?? '');
      expect(descs.some((d: string) => d.includes('Description text here'))).toBe(true);
    });
  });

  describe('Button → ButtonBuilder', () => {
    it('should render buttons with correct custom IDs', () => {
      const btnComps = createA2UIButtonPair('Click Me', 'do_thing', 'primary');
      const card = createA2UIContainer('Test', 'Body', btnComps);
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components);
      expect(result.components).toBeDefined();
      expect(result.components!.length).toBeGreaterThanOrEqual(1);
      const comps = componentData(result, 0);
      expect(comps.length).toBeGreaterThanOrEqual(1);
      const ids = comps.map((c: any) => c.data?.custom_id ?? c.custom_id);
      expect(ids.some((id: string) => id?.includes('do_thing'))).toBe(true);
    });

    it('should set primary style for primary buttons', () => {
      const btnComps = createA2UIButtonPair('Go', 'go', 'primary');
      const card = createA2UIContainer('T', 'B', btnComps);
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components);
      const comps = componentData(result, 0);
      const styles = comps.map((c: any) => c.data?.style ?? c.style);
      expect(styles).toContain(1); // ButtonStyle.Primary
    });

    it('should set danger style for danger buttons', () => {
      const btnComps = createA2UIButtonPair('Delete', 'delete', 'danger');
      const card = createA2UIContainer('T', 'B', btnComps);
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components);
      const comps = componentData(result, 0);
      const styles = comps.map((c: any) => c.data?.style ?? c.style);
      expect(styles).toContain(4); // ButtonStyle.Danger
    });
  });

  describe('ChoicePicker → StringSelectMenuBuilder', () => {
    it('should render a select menu with options', () => {
      const select = createA2UISelectMenu([
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ]);
      const card = createA2UIContainer('Pick', 'Choose one', [select]);
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components);
      expect(result.components).toBeDefined();
      // Find the select menu row
      const selectRow = result.components!.find((r: any) => {
        const comps = (r as any).components ?? [];
        return comps.some((c: any) => (c.data?.type ?? c.type) === 3); // SelectMenu type
      });
      expect(selectRow).toBeDefined();
    });
  });

  describe('TextField → embed field', () => {
    it('should render text fields in embed', () => {
      const field = createA2UITextField('Email', 'shortText');
      const card = createA2UIContainer('Form', 'Fill out', [field]);
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components);
      const embed = result.embeds!.find((e: any) => {
        const fields = (e as any).data?.fields ?? [];
        return fields.some((f: any) => f.name === 'Email');
      });
      expect(embed).toBeDefined();
    });
  });

  describe('CheckBox → embed field', () => {
    it('should render checkbox as embed field', () => {
      const cb = createA2UICheckBox('Accept terms');
      const card = createA2UIContainer('Terms', 'Please accept', [cb]);
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components);
      const embed = result.embeds!.find((e: any) => {
        const fields = (e as any).data?.fields ?? [];
        return fields.some((f: any) => f.name?.includes('Accept terms'));
      });
      expect(embed).toBeDefined();
    });
  });

  describe('Divider → empty field', () => {
    it('should render divider as blank embed field', () => {
      const divider = createA2UIDivider();
      const card = createA2UIContainer('Test', 'Body', [divider]);
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components);
      const embed = result.embeds!.find((e: any) => {
        const fields = (e as any).data?.fields ?? [];
        return fields.some((f: any) => f.name === '\u200B');
      });
      expect(embed).toBeDefined();
    });
  });

  describe('Image → embed image', () => {
    it('should render image as embed image', () => {
      const img = createA2UIImage('https://example.com/hero.png');
      const card = createA2UIContainer('Gallery', 'Images', [img]);
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components);
      const embed = result.embeds!.find((e: any) => {
        const d = (e as any).data ?? e;
        return d.image?.url === 'https://example.com/hero.png';
      });
      expect(embed).toBeDefined();
    });

    it('should render thumbnail variant as embed thumbnail', () => {
      const img = createA2UIImage('https://example.com/thumb.png', 'thumbnail');
      const card = createA2UIContainer('Profile', 'Info', [img]);
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components);
      const embed = result.embeds!.find((e: any) => {
        const d = (e as any).data ?? e;
        return d.thumbnail?.url === 'https://example.com/thumb.png';
      });
      expect(embed).toBeDefined();
    });
  });

  describe('Icon → emoji', () => {
    it('should render known icon as emoji', () => {
      const icon = createA2UIIcon('check');
      // Icons outside cards go to content
      const payload = buildA2UIPayload([{ components: [icon], rootId: icon.id }]);
      // Directly test with minimal components
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: ['icon1'] },
        { id: 'icon1', component: 'Icon', name: 'check' },
      ];
      const result = renderer.render(components);
      // Should contain the check emoji somewhere
      const content = result.content ?? '';
      const desc = result.embeds?.map((e: any) => (e as any).data?.description ?? '').join('') ?? '';
      expect(content + desc).toContain('✅');
    });
  });

  describe('Fallback for unsupported types', () => {
    it('should render fallback text for unknown component', () => {
      const components: A2UIComponent[] = [
        { id: 'root', component: 'Column', children: ['unknown1'] },
        { id: 'unknown1', component: 'FancyWidget' },
      ];
      const result = renderer.render(components);
      const content = result.content ?? '';
      const desc = result.embeds?.map((e: any) => (e as any).data?.description ?? '').join('') ?? '';
      expect(content + desc).toContain('FancyWidget');
    });
  });

  describe('A2H intent metadata → colors/layout', () => {
    it('should apply blue color for INFORM intent', () => {
      const card = createA2UIContainer('Info', 'Details');
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components, { intent: 'INFORM' });
      const firstEmbed = result.embeds![0] as any;
      expect(firstEmbed.data?.color ?? firstEmbed.color).toBe(0x3498db);
    });

    it('should apply orange color for AUTHORIZE intent', () => {
      const card = createA2UIContainer('Auth', 'Approve?');
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components, { intent: 'AUTHORIZE' });
      const firstEmbed = result.embeds![0] as any;
      expect(firstEmbed.data?.color ?? firstEmbed.color).toBe(0xe67e22);
    });

    it('should add approve/deny buttons for AUTHORIZE intent', () => {
      const card = createA2UIContainer('Auth', 'Approve?');
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components, { intent: 'AUTHORIZE' });
      expect(result.components).toBeDefined();
      const comps = componentData(result, 0);
      const ids = comps.map((c: any) => c.data?.custom_id ?? c.custom_id);
      expect(ids).toContain('a2ui-approve');
      expect(ids).toContain('a2ui-deny');
    });

    it('should apply green for successful RESULT', () => {
      const card = createA2UIContainer('Done', 'Success');
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components, { intent: 'RESULT', success: true });
      const firstEmbed = result.embeds![0] as any;
      expect(firstEmbed.data?.color ?? firstEmbed.color).toBe(0x2ecc71);
    });

    it('should apply red for failed RESULT', () => {
      const card = createA2UIContainer('Failed', 'Error');
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components, { intent: 'RESULT', success: false });
      const firstEmbed = result.embeds![0] as any;
      expect(firstEmbed.data?.color ?? firstEmbed.color).toBe(0xe74c3c);
    });

    it('should add collect button for COLLECT intent', () => {
      const card = createA2UIContainer('Form', 'Fill out');
      const payload = buildA2UIPayload([card]);
      const result = renderer.render(payload.components, { intent: 'COLLECT' });
      expect(result.components).toBeDefined();
      const comps = componentData(result, 0);
      const ids = comps.map((c: any) => c.data?.custom_id ?? c.custom_id);
      expect(ids).toContain('a2ui-collect-respond');
    });
  });

  describe('Empty / edge cases', () => {
    it('should handle empty component array', () => {
      const result = renderer.render([]);
      expect(result.content).toContain('No A2UI');
    });

    it('should handle components without root', () => {
      const components: A2UIComponent[] = [
        { id: 'orphan', component: 'Text', text: 'Hello', variant: 'body' },
      ];
      const result = renderer.render(components);
      expect(result).toBeDefined();
    });
  });
});
