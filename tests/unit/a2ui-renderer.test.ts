/**
 * Unit tests for Discord Catalog A2UI Renderer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DiscordCatalogRenderer } from '../../src/rendering/a2ui-renderer';
import type {
  A2UIMessage,
  DiscordMessageComponent,
  DiscordEmbedComponent,
  DiscordActionRowComponent,
  DiscordButtonComponent,
  DiscordSelectMenuComponent,
  DiscordModalComponent,
  DiscordTextInputComponent,
} from '../../src/types';
import { DISCORD_CATALOG_ID } from '../../src/types';
import {
  createA2UIMessages,
  createDiscordMessageWithEmbed,
  createDiscordMessageWithButtons,
  createDiscordMessageWithSelect,
  createDiscordModal,
  resetA2UICounter,
} from '../helpers/a2a-fixtures';

let renderer: DiscordCatalogRenderer;

beforeEach(() => {
  renderer = new DiscordCatalogRenderer();
  resetA2UICounter();
});

function embedData(result: any, idx = 0): any {
  return result.embeds?.[idx]?.data ?? result.embeds?.[idx] ?? {};
}

function componentData(result: any, rowIdx = 0): any[] {
  const row = result.components?.[rowIdx] as any;
  return row?.components ?? row?.data?.components ?? [];
}

describe('Discord Catalog Renderer', () => {
  describe('DiscordEmbed rendering', () => {
    it('should render embed with title and description', () => {
      const root = createDiscordMessageWithEmbed('Hello', 'World');
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      expect(result.embeds).toBeDefined();
      expect(result.embeds!.length).toBe(1);
      const d = embedData(result, 0);
      expect(d.title).toBe('Hello');
      expect(d.description).toBe('World');
    });

    it('should render embed with color', () => {
      const root = createDiscordMessageWithEmbed('Title', 'Desc', { color: '#3498db' });
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      const d = embedData(result, 0);
      expect(d.color).toBe(0x3498db);
    });

    it('should render embed with fields', () => {
      const root = createDiscordMessageWithEmbed('Title', 'Desc', {
        fields: [
          { name: 'Field 1', value: 'Value 1', inline: true },
          { name: 'Field 2', value: 'Value 2', inline: false },
        ],
      });
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      const d = embedData(result, 0);
      expect(d.fields).toHaveLength(2);
      expect(d.fields[0].name).toBe('Field 1');
      expect(d.fields[0].inline).toBe(true);
    });

    it('should render embed with footer', () => {
      const root = createDiscordMessageWithEmbed('Title', 'Desc', { footer: 'Footer text' });
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      const d = embedData(result, 0);
      expect(d.footer.text).toBe('Footer text');
    });

    it('should render multiple embeds', () => {
      const root: DiscordMessageComponent = {
        id: 'root', component: 'DiscordMessage',
        embeds: [
          { id: 'e1', component: 'DiscordEmbed', title: 'Embed 1' },
          { id: 'e2', component: 'DiscordEmbed', title: 'Embed 2' },
          { id: 'e3', component: 'DiscordEmbed', title: 'Embed 3' },
        ],
      };
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      expect(result.embeds).toHaveLength(3);
    });

    it('should render embed with thumbnail and image', () => {
      const root: DiscordMessageComponent = {
        id: 'root', component: 'DiscordMessage',
        embeds: [{
          id: 'e1', component: 'DiscordEmbed',
          title: 'Images',
          thumbnail: 'https://example.com/thumb.png',
          image: 'https://example.com/hero.png',
        }],
      };
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      const d = embedData(result, 0);
      expect(d.thumbnail.url).toBe('https://example.com/thumb.png');
      expect(d.image.url).toBe('https://example.com/hero.png');
    });

    it('should render embed with timestamp', () => {
      const root: DiscordMessageComponent = {
        id: 'root', component: 'DiscordMessage',
        embeds: [{ id: 'e1', component: 'DiscordEmbed', title: 'Timed', timestamp: true }],
      };
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      const d = embedData(result, 0);
      expect(d.timestamp).toBeDefined();
    });
  });

  describe('DiscordButton rendering', () => {
    it('should render buttons with correct custom IDs', () => {
      const root = createDiscordMessageWithButtons('Test', [
        { label: 'Click Me', customId: 'do-thing', style: 'primary' },
      ]);
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      expect(result.components).toBeDefined();
      const comps = componentData(result, 0);
      expect(comps.length).toBeGreaterThanOrEqual(1);
      const ids = comps.map((c: any) => c.data?.custom_id ?? c.custom_id);
      expect(ids).toContain('do-thing');
    });

    it('should set primary style', () => {
      const root = createDiscordMessageWithButtons('Test', [
        { label: 'Go', customId: 'go', style: 'primary' },
      ]);
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      const comps = componentData(result, 0);
      const styles = comps.map((c: any) => c.data?.style ?? c.style);
      expect(styles).toContain(1); // ButtonStyle.Primary
    });

    it('should set danger style', () => {
      const root = createDiscordMessageWithButtons('Test', [
        { label: 'Delete', customId: 'delete', style: 'danger' },
      ]);
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      const comps = componentData(result, 0);
      const styles = comps.map((c: any) => c.data?.style ?? c.style);
      expect(styles).toContain(4); // ButtonStyle.Danger
    });

    it('should set success style', () => {
      const root = createDiscordMessageWithButtons('Test', [
        { label: 'Approve', customId: 'approve', style: 'success' },
      ]);
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      const comps = componentData(result, 0);
      const styles = comps.map((c: any) => c.data?.style ?? c.style);
      expect(styles).toContain(3); // ButtonStyle.Success
    });

    it('should render multiple buttons in one action row', () => {
      const root = createDiscordMessageWithButtons('Test', [
        { label: 'A', customId: 'a', style: 'primary' },
        { label: 'B', customId: 'b', style: 'secondary' },
        { label: 'C', customId: 'c', style: 'danger' },
      ]);
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      const comps = componentData(result, 0);
      expect(comps).toHaveLength(3);
    });

    it('should handle disabled buttons', () => {
      const root: DiscordMessageComponent = {
        id: 'root', component: 'DiscordMessage',
        components: [{
          id: 'row', component: 'DiscordActionRow',
          children: [
            { id: 'btn', component: 'DiscordButton', label: 'Disabled', customId: 'x', disabled: true },
          ],
        }],
      };
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      const comps = componentData(result, 0);
      expect(comps[0].data?.disabled ?? comps[0].disabled).toBe(true);
    });
  });

  describe('DiscordSelectMenu rendering', () => {
    it('should render a select menu with options', () => {
      const root = createDiscordMessageWithSelect('Pick', [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ]);
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      expect(result.components).toBeDefined();
      const comps = componentData(result, 0);
      const selectComp = comps.find((c: any) => (c.data?.type ?? c.type) === 3);
      expect(selectComp).toBeDefined();
    });

    it('should set placeholder', () => {
      const root = createDiscordMessageWithSelect('Pick', [{ label: 'A', value: 'a' }]);
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      const comps = componentData(result, 0);
      const selectComp = comps[0];
      expect(selectComp.data?.placeholder ?? selectComp.placeholder).toBe('Choose...');
    });

    it('should set custom ID', () => {
      const root = createDiscordMessageWithSelect('Pick', [{ label: 'A', value: 'a' }], 'my-select');
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      const comps = componentData(result, 0);
      const selectComp = comps[0];
      expect(selectComp.data?.custom_id ?? selectComp.custom_id).toBe('my-select');
    });
  });

  describe('DiscordModal rendering', () => {
    it('should render a modal with text inputs', () => {
      const modal = createDiscordModal('Test Modal', 'test-modal', [
        { label: 'Name', customId: 'name-input', style: 'short' },
        { label: 'Description', customId: 'desc-input', style: 'paragraph' },
      ]);
      const msgs: A2UIMessage[] = [
        { version: 'v0.9', createSurface: { surfaceId: 'modal-test', catalogId: DISCORD_CATALOG_ID } },
        { version: 'v0.9', updateComponents: { surfaceId: 'modal-test', components: [modal] } },
      ];
      const result = renderer.render(msgs);
      expect(result.modals).toHaveLength(1);
      const m = result.modals[0] as any;
      expect(m.data?.custom_id ?? m.customId).toBe('test-modal');
      expect(m.data?.title ?? m.title).toBe('Test Modal');
    });
  });

  describe('DiscordMessage with content only', () => {
    it('should render plain text content', () => {
      const root: DiscordMessageComponent = {
        id: 'root', component: 'DiscordMessage',
        content: 'Hello world!',
      };
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      expect(result.content).toBe('Hello world!');
    });
  });

  describe('createSurface handling', () => {
    it('should process createSurface without error', () => {
      const msgs: A2UIMessage[] = [
        { version: 'v0.9', createSurface: { surfaceId: 'test', catalogId: DISCORD_CATALOG_ID } },
      ];
      const result = renderer.render(msgs);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toContain('No Discord components');
    });
  });

  describe('Empty / edge cases', () => {
    it('should handle empty message array', () => {
      const result = renderer.render([]);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toContain('No Discord components');
    });

    it('should handle message with no embeds or components', () => {
      const root: DiscordMessageComponent = { id: 'root', component: 'DiscordMessage' };
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);
      expect(result.content).toBe('*Empty message*');
    });
  });

  describe('Full kitchen-sink rendering', () => {
    it('should render embeds + buttons + select in one message', () => {
      const root: DiscordMessageComponent = {
        id: 'root', component: 'DiscordMessage',
        embeds: [{
          id: 'ks-embed', component: 'DiscordEmbed',
          title: '🍳 Kitchen Sink',
          description: 'Everything',
          color: '#3498db',
          fields: [{ name: 'Key', value: 'Val', inline: true }],
          thumbnail: 'https://example.com/thumb.png',
          footer: 'Footer',
        }],
        components: [
          {
            id: 'btn-row', component: 'DiscordActionRow',
            children: [
              { id: 'b1', component: 'DiscordButton', label: 'Approve', style: 'success', customId: 'approve' },
              { id: 'b2', component: 'DiscordButton', label: 'Deny', style: 'danger', customId: 'deny' },
            ],
          },
          {
            id: 'select-row', component: 'DiscordActionRow',
            children: [{
              id: 's1', component: 'DiscordSelectMenu',
              customId: 'ks-select',
              options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }],
            }],
          },
        ],
      };
      const msgs = createA2UIMessages('test', root);
      const result = renderer.renderFirstMessage(msgs);

      // Embeds
      expect(result.embeds).toHaveLength(1);
      const d = embedData(result, 0);
      expect(d.title).toBe('🍳 Kitchen Sink');
      expect(d.fields).toHaveLength(1);
      expect(d.thumbnail.url).toBe('https://example.com/thumb.png');

      // Buttons
      expect(result.components).toHaveLength(2);
      const btnComps = componentData(result, 0);
      expect(btnComps).toHaveLength(2);

      // Select
      const selectComps = componentData(result, 1);
      expect(selectComps).toHaveLength(1);
      expect((selectComps[0].data?.type ?? selectComps[0].type)).toBe(3);
    });
  });

  describe('Wire format structure', () => {
    it('should accept proper v0.9 createSurface + updateComponents', () => {
      const msgs: A2UIMessage[] = [
        {
          version: 'v0.9',
          createSurface: { surfaceId: 'my-surface', catalogId: DISCORD_CATALOG_ID },
        },
        {
          version: 'v0.9',
          updateComponents: {
            surfaceId: 'my-surface',
            components: [{
              id: 'root', component: 'DiscordMessage',
              embeds: [{ id: 'e1', component: 'DiscordEmbed', title: 'Test', description: 'Works!' }],
            }],
          },
        },
      ];
      const result = renderer.renderFirstMessage(msgs);
      expect(result.embeds).toHaveLength(1);
      expect(embedData(result, 0).title).toBe('Test');
    });
  });
});
