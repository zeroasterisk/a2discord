/**
 * A2UI → Discord renderer.
 *
 * Takes A2UI v0.9 component trees and renders them as Discord message options
 * (embeds, buttons, select menus, modals).
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import type { DiscordMessageOptions } from '../types.js';

// ─── A2UI Types (v0.9 simplified) ───

export interface A2UIComponent {
  id: string;
  component: string;
  // Text
  text?: string;
  variant?: string;
  // Image
  url?: string;
  fit?: string;
  // Button
  child?: string;
  action?: { event?: { name: string }; name?: string };
  // Layout
  children?: string[] | { componentId: string; path: string };
  justify?: string;
  align?: string;
  // TextField
  label?: string;
  value?: string | { path: string };
  textFieldType?: string;
  validationRegexp?: string;
  // ChoicePicker
  options?: { label: string; value: string; description?: string; emoji?: string }[];
  selections?: { path: string } | string;
  maxAllowedSelections?: number;
  // Icon
  name?: string;
  // Divider
  axis?: string;
  // CheckBox
  // Slider
  minValue?: number;
  maxValue?: number;
  // DateTimeInput
  enableDate?: boolean;
  enableTime?: boolean;
  // Modal
  entryPointChild?: string;
  contentChild?: string;
  // Tabs
  tabItems?: { title: string; child: string }[];
  // Accessibility
  accessibility?: { label?: string; role?: string };
  // Generic
  [key: string]: unknown;
}

export interface A2UIPayload {
  version?: string;
  components: A2UIComponent[];
}

export type A2HIntent = 'INFORM' | 'AUTHORIZE' | 'COLLECT' | 'RESULT' | 'ESCALATE';

// ─── Colors ───

const COLORS: Record<string, number> = {
  INFORM: 0x3498db,
  AUTHORIZE: 0xe67e22,
  COLLECT: 0xe67e22,
  RESULT_SUCCESS: 0x2ecc71,
  RESULT_FAILURE: 0xe74c3c,
  ESCALATE: 0xf1c40f,
  DEFAULT: 0x3498db,
};

const INTENT_TITLES: Record<string, string> = {
  INFORM: 'ℹ️ Information',
  AUTHORIZE: '🔐 Authorization Required',
  COLLECT: '📝 Input Required',
  RESULT: '✅ Result',
  ESCALATE: '⚠️ Escalation',
};

// ─── Icon mapping ───

const ICON_MAP: Record<string, string> = {
  check: '✅', close: '❌', warning: '⚠️', info: 'ℹ️',
  error: '❌', success: '✅', star: '⭐', heart: '❤️',
  search: '🔍', settings: '⚙️', home: '🏠', user: '👤',
  mail: '📧', calendar: '📅', clock: '🕐', bell: '🔔',
  lock: '🔒', unlock: '🔓', edit: '✏️', delete: '🗑️',
  add: '➕', remove: '➖', refresh: '🔄', download: '⬇️',
  upload: '⬆️', link: '🔗', code: '💻', file: '📄',
};

// ─── Renderer ───

export class A2UIRenderer {
  private componentMap: Map<string, A2UIComponent> = new Map();

  /**
   * Main entry point. Takes A2UI components + optional metadata,
   * returns discord.js message options.
   */
  render(
    components: A2UIComponent[],
    metadata?: Record<string, unknown>,
  ): DiscordMessageOptions {
    // Build lookup map
    this.componentMap = new Map(components.map(c => [c.id, c]));

    const intent = metadata?.intent as A2HIntent | undefined;
    const success = metadata?.success !== false;

    // Find root component
    const root = this.componentMap.get('root') ?? components[0];
    if (!root) {
      return { content: '*No A2UI components to render*' };
    }

    const embeds: EmbedBuilder[] = [];
    const actionRows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];
    const contentParts: string[] = [];

    // Walk the tree
    this.walkComponent(root, embeds, actionRows, contentParts);

    // Apply intent styling to first embed
    if (embeds.length > 0 && intent) {
      const color = intent === 'RESULT'
        ? (success ? COLORS.RESULT_SUCCESS : COLORS.RESULT_FAILURE)
        : (COLORS[intent] ?? COLORS.DEFAULT);
      embeds[0].setColor(color);

      // Set title if not already set
      const data = (embeds[0] as any).data;
      if (!data?.title) {
        const title = intent === 'RESULT'
          ? (success ? '✅ Result' : '❌ Result')
          : INTENT_TITLES[intent];
        if (title) embeds[0].setTitle(title);
      }
    }

    // If no embeds were created but we have content, make a default embed
    if (embeds.length === 0 && contentParts.length > 0) {
      const embed = new EmbedBuilder()
        .setDescription(contentParts.join('\n').slice(0, 4096));
      if (intent) {
        const color = intent === 'RESULT'
          ? (success ? COLORS.RESULT_SUCCESS : COLORS.RESULT_FAILURE)
          : (COLORS[intent] ?? COLORS.DEFAULT);
        embed.setColor(color);
        const title = intent === 'RESULT'
          ? (success ? '✅ Result' : '❌ Result')
          : INTENT_TITLES[intent];
        if (title) embed.setTitle(title);
      }
      embeds.push(embed);
    }

    // Add AUTHORIZE buttons if intent says so and no buttons exist
    if (intent === 'AUTHORIZE' && actionRows.length === 0) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('a2ui-approve')
          .setLabel('✅ Approve')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('a2ui-deny')
          .setLabel('❌ Deny')
          .setStyle(ButtonStyle.Danger),
      );
      actionRows.push(row);
    }

    // Add COLLECT modal trigger if intent says so and no buttons exist
    if (intent === 'COLLECT' && actionRows.length === 0) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('a2ui-collect-respond')
          .setLabel('📝 Provide Info')
          .setStyle(ButtonStyle.Primary),
      );
      actionRows.push(row);
    }

    const result: DiscordMessageOptions = {};
    if (embeds.length > 0) result.embeds = embeds.slice(0, 10);
    if (actionRows.length > 0) result.components = actionRows.slice(0, 5);
    if (!result.embeds && !result.components) {
      result.content = contentParts.join('\n').slice(0, 2000) || '*Empty A2UI response*';
    }

    return result;
  }

  /**
   * Recursively walk a component and populate embeds/actionRows/content.
   */
  private walkComponent(
    comp: A2UIComponent,
    embeds: EmbedBuilder[],
    actionRows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[],
    contentParts: string[],
  ): void {
    switch (comp.component) {
      case 'Card':
        this.renderCard(comp, embeds, actionRows, contentParts);
        break;
      case 'Column':
      case 'List':
        this.renderLayoutChildren(comp, embeds, actionRows, contentParts);
        break;
      case 'Row':
        this.renderRow(comp, embeds, actionRows, contentParts);
        break;
      case 'Text':
        this.renderText(comp, embeds, contentParts);
        break;
      case 'Image':
        this.renderImage(comp, embeds);
        break;
      case 'Icon':
        this.renderIcon(comp, contentParts);
        break;
      case 'Divider':
        this.renderDivider(embeds, contentParts);
        break;
      case 'Button':
        this.renderButton(comp, actionRows);
        break;
      case 'TextField':
        this.renderTextField(comp, embeds);
        break;
      case 'CheckBox':
        this.renderCheckBox(comp, embeds);
        break;
      case 'Slider':
        this.renderSlider(comp, embeds);
        break;
      case 'DateTimeInput':
        this.renderDateTimeInput(comp, embeds);
        break;
      case 'ChoicePicker':
      case 'MultipleChoice':
        this.renderChoicePicker(comp, actionRows);
        break;
      case 'Modal':
        this.renderModal(comp, embeds, actionRows, contentParts);
        break;
      case 'Tabs':
        this.renderTabs(comp, embeds, actionRows, contentParts);
        break;
      default:
        contentParts.push(this.renderFallback(comp));
        break;
    }
  }

  private renderCard(
    comp: A2UIComponent,
    embeds: EmbedBuilder[],
    actionRows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[],
    contentParts: string[],
  ): void {
    // Card creates a new embed
    const embed = new EmbedBuilder().setColor(COLORS.DEFAULT);
    embeds.push(embed);

    if (comp.child) {
      const child = this.componentMap.get(comp.child);
      if (child) {
        // Collect card's inner content into this embed
        const innerContent: string[] = [];
        const innerRows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];
        this.walkCardContent(child, embed, innerRows, innerContent);
        if (innerContent.length > 0) {
          const existing = (embed as any).data?.description ?? '';
          const desc = (existing ? existing + '\n' : '') + innerContent.join('\n');
          embed.setDescription(desc.slice(0, 4096));
        }
        actionRows.push(...innerRows);
      }
    }
  }

  /**
   * Walk content inside a Card, adding to the card's embed rather than creating new ones.
   */
  private walkCardContent(
    comp: A2UIComponent,
    embed: EmbedBuilder,
    actionRows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[],
    contentParts: string[],
  ): void {
    switch (comp.component) {
      case 'Column':
      case 'List':
      case 'Row': {
        const childIds = this.resolveChildren(comp);
        for (const childId of childIds) {
          const child = this.componentMap.get(childId);
          if (child) this.walkCardContent(child, embed, actionRows, contentParts);
        }
        break;
      }
      case 'Text': {
        const text = typeof comp.text === 'string' ? comp.text : '';
        const variant = comp.variant;
        if (variant === 'h1') {
          embed.setTitle(text.slice(0, 256));
        } else if (variant === 'caption') {
          embed.setFooter({ text: text.slice(0, 2048) });
        } else if (variant && ['h2', 'h3', 'h4', 'h5'].includes(variant)) {
          embed.addFields({ name: text.slice(0, 256), value: '\u200B', inline: false });
        } else {
          contentParts.push(text);
        }
        break;
      }
      case 'Image': {
        const url = typeof comp.url === 'string' ? comp.url : '';
        if (url) {
          if (comp.variant === 'thumbnail') {
            embed.setThumbnail(url);
          } else {
            embed.setImage(url);
          }
        }
        break;
      }
      case 'Icon':
        contentParts.push(ICON_MAP[comp.name ?? ''] ?? `[${comp.name}]`);
        break;
      case 'Divider':
        embed.addFields({ name: '\u200B', value: '\u200B', inline: false });
        break;
      case 'Button':
        this.renderButton(comp, actionRows);
        break;
      case 'TextField':
        this.renderTextField(comp, [embed]);
        break;
      case 'CheckBox':
        this.renderCheckBox(comp, [embed]);
        break;
      case 'Slider':
        this.renderSlider(comp, [embed]);
        break;
      case 'DateTimeInput':
        this.renderDateTimeInput(comp, [embed]);
        break;
      case 'ChoicePicker':
      case 'MultipleChoice':
        this.renderChoicePicker(comp, actionRows);
        break;
      default:
        contentParts.push(this.renderFallback(comp));
        break;
    }
  }

  private renderLayoutChildren(
    comp: A2UIComponent,
    embeds: EmbedBuilder[],
    actionRows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[],
    contentParts: string[],
  ): void {
    const childIds = this.resolveChildren(comp);
    for (const childId of childIds) {
      const child = this.componentMap.get(childId);
      if (child) this.walkComponent(child, embeds, actionRows, contentParts);
    }
  }

  private renderRow(
    comp: A2UIComponent,
    embeds: EmbedBuilder[],
    actionRows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[],
    contentParts: string[],
  ): void {
    const childIds = this.resolveChildren(comp);
    // Check if all children are buttons → ActionRow
    const children = childIds.map(id => this.componentMap.get(id)).filter(Boolean) as A2UIComponent[];
    const allButtons = children.length > 0 && children.every(c => c.component === 'Button');

    if (allButtons) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (const child of children.slice(0, 5)) {
        row.addComponents(this.buildButton(child));
      }
      actionRows.push(row);
    } else {
      // Mixed row → render children normally
      for (const child of children) {
        this.walkComponent(child, embeds, actionRows, contentParts);
      }
    }
  }

  private renderText(
    comp: A2UIComponent,
    embeds: EmbedBuilder[],
    contentParts: string[],
  ): void {
    const text = typeof comp.text === 'string' ? comp.text : '';
    const variant = comp.variant;

    if (variant === 'h1') {
      // Create or update embed with title
      const embed = this.getOrCreateEmbed(embeds);
      embed.setTitle(text.slice(0, 256));
    } else if (variant === 'caption') {
      const embed = this.getOrCreateEmbed(embeds);
      embed.setFooter({ text: text.slice(0, 2048) });
    } else if (variant && ['h2', 'h3', 'h4', 'h5'].includes(variant)) {
      const embed = this.getOrCreateEmbed(embeds);
      embed.addFields({ name: text.slice(0, 256), value: '\u200B', inline: false });
    } else {
      contentParts.push(text);
    }
  }

  private renderImage(comp: A2UIComponent, embeds: EmbedBuilder[]): void {
    const url = typeof comp.url === 'string' ? comp.url : '';
    if (!url) return;
    const embed = this.getOrCreateEmbed(embeds);
    if (comp.variant === 'thumbnail') {
      embed.setThumbnail(url);
    } else {
      embed.setImage(url);
    }
  }

  private renderIcon(comp: A2UIComponent, contentParts: string[]): void {
    const name = comp.name ?? '';
    contentParts.push(ICON_MAP[name] ?? `[${name}]`);
  }

  private renderDivider(embeds: EmbedBuilder[], contentParts: string[]): void {
    if (embeds.length > 0) {
      embeds[embeds.length - 1].addFields({ name: '\u200B', value: '\u200B', inline: false });
    } else {
      contentParts.push('───');
    }
  }

  private renderButton(
    comp: A2UIComponent,
    actionRows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[],
  ): void {
    const button = this.buildButton(comp);
    // Find or create a button action row
    let row = actionRows.find(r => {
      const comps = (r as any).components ?? [];
      return comps.length < 5 && comps.every((c: any) => (c.data?.type ?? c.type) === 2); // Button type
    });
    if (!row) {
      row = new ActionRowBuilder<ButtonBuilder>();
      actionRows.push(row);
    }
    (row as ActionRowBuilder<ButtonBuilder>).addComponents(button);
  }

  private buildButton(comp: A2UIComponent): ButtonBuilder {
    // Resolve label from child text component
    let label = comp.id;
    if (comp.child) {
      const childComp = this.componentMap.get(comp.child);
      if (childComp?.component === 'Text' && typeof childComp.text === 'string') {
        label = childComp.text;
      }
    }

    const actionName = comp.action?.event?.name ?? comp.action?.name ?? comp.id;
    const style = comp.variant === 'primary' || comp.primary
      ? ButtonStyle.Primary
      : comp.variant === 'danger'
        ? ButtonStyle.Danger
        : comp.variant === 'success'
          ? ButtonStyle.Success
          : ButtonStyle.Secondary;

    return new ButtonBuilder()
      .setCustomId(`a2ui-${actionName}`)
      .setLabel(label.slice(0, 80))
      .setStyle(style);
  }

  private renderTextField(comp: A2UIComponent, embeds: EmbedBuilder[]): void {
    const label = typeof comp.label === 'string' ? comp.label : comp.id;
    const type = comp.textFieldType ?? 'shortText';
    const embed = this.getOrCreateEmbed(embeds);
    embed.addFields({
      name: label.slice(0, 256),
      value: `*${type === 'longText' ? 'Long text' : 'Text'} input*`,
      inline: true,
    });
  }

  private renderCheckBox(comp: A2UIComponent, embeds: EmbedBuilder[]): void {
    const label = typeof comp.label === 'string' ? comp.label : comp.id;
    const embed = this.getOrCreateEmbed(embeds);
    embed.addFields({
      name: `☐ ${label}`.slice(0, 256),
      value: '*Toggle*',
      inline: true,
    });
  }

  private renderSlider(comp: A2UIComponent, embeds: EmbedBuilder[]): void {
    const embed = this.getOrCreateEmbed(embeds);
    embed.addFields({
      name: comp.id,
      value: `Slider: ${comp.minValue ?? 0} — ${comp.maxValue ?? 100}`,
      inline: true,
    });
  }

  private renderDateTimeInput(comp: A2UIComponent, embeds: EmbedBuilder[]): void {
    const embed = this.getOrCreateEmbed(embeds);
    const parts = [];
    if (comp.enableDate !== false) parts.push('date');
    if (comp.enableTime) parts.push('time');
    embed.addFields({
      name: comp.id,
      value: `*Pick ${parts.join(' & ') || 'date'}*`,
      inline: true,
    });
  }

  private renderChoicePicker(
    comp: A2UIComponent,
    actionRows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[],
  ): void {
    if (!comp.options?.length) return;
    const select = new StringSelectMenuBuilder()
      .setCustomId(`a2ui-select-${comp.id}`)
      .setPlaceholder('Select an option...');

    if (comp.maxAllowedSelections && comp.maxAllowedSelections > 1) {
      select.setMaxValues(Math.min(comp.maxAllowedSelections, comp.options.length));
    }

    for (const opt of comp.options.slice(0, 25)) {
      const option: { label: string; value: string; description?: string; emoji?: string } = {
        label: (typeof opt.label === 'string' ? opt.label : String(opt.label)).slice(0, 100),
        value: String(opt.value),
      };
      if (opt.description) option.description = opt.description.slice(0, 100);
      if (opt.emoji) option.emoji = opt.emoji;
      select.addOptions(option);
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    actionRows.push(row);
  }

  private renderModal(
    comp: A2UIComponent,
    embeds: EmbedBuilder[],
    actionRows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[],
    contentParts: string[],
  ): void {
    // Render the entry point (usually a button)
    if (comp.entryPointChild) {
      const entry = this.componentMap.get(comp.entryPointChild);
      if (entry) this.walkComponent(entry, embeds, actionRows, contentParts);
    }
    // Modal content gets rendered as embed fields (content itself is shown when modal opens)
    if (comp.contentChild) {
      const content = this.componentMap.get(comp.contentChild);
      if (content) this.walkComponent(content, embeds, actionRows, contentParts);
    }
  }

  private renderTabs(
    comp: A2UIComponent,
    embeds: EmbedBuilder[],
    actionRows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[],
    contentParts: string[],
  ): void {
    if (!comp.tabItems?.length) return;
    // Render first tab as content, add navigation buttons
    const firstTab = comp.tabItems[0];
    if (firstTab.child) {
      const child = this.componentMap.get(firstTab.child);
      if (child) this.walkComponent(child, embeds, actionRows, contentParts);
    }

    // Tab navigation buttons
    if (comp.tabItems.length > 1) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (const tab of comp.tabItems.slice(0, 5)) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`a2ui-tab-${tab.child}`)
            .setLabel(tab.title.slice(0, 80))
            .setStyle(ButtonStyle.Secondary),
        );
      }
      actionRows.push(row);
    }
  }

  /**
   * Fallback for unsupported component types.
   */
  renderFallback(comp: A2UIComponent): string {
    return `*[${comp.component}: ${comp.id}]*`;
  }

  // ─── Helpers ───

  private resolveChildren(comp: A2UIComponent): string[] {
    if (Array.isArray(comp.children)) return comp.children;
    if (comp.children && typeof comp.children === 'object' && 'componentId' in comp.children) {
      return []; // Template-based children not supported in static rendering
    }
    return [];
  }

  private getOrCreateEmbed(embeds: EmbedBuilder[]): EmbedBuilder {
    if (embeds.length > 0) return embeds[embeds.length - 1];
    const embed = new EmbedBuilder().setColor(COLORS.DEFAULT);
    embeds.push(embed);
    return embed;
  }
}
