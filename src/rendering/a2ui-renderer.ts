/**
 * A2UI Discord Catalog Renderer.
 *
 * Takes A2UI v0.9 messages using the Discord catalog and renders them
 * as discord.js objects (embeds, buttons, select menus, modals).
 *
 * Uses web_core's MessageProcessor for message processing.
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { discordCatalog, type DiscordComponentApi } from './discord-catalog.js';
import type {
  A2UIMessage,
  DiscordMessageOptions,
  DiscordRenderResult,
  DiscordEmbedComponent,
  DiscordActionRowComponent,
  DiscordButtonComponent,
  DiscordSelectMenuComponent,
  DiscordTextInputComponent,
} from '../types.js';

// ─── Style Mapping ───

const BUTTON_STYLE_MAP: Record<string, ButtonStyle> = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
  link: ButtonStyle.Link,
};

function parseColor(hex?: string): number | undefined {
  if (!hex) return undefined;
  const clean = hex.replace('#', '');
  return parseInt(clean, 16);
}

// ─── Renderer ───

export class DiscordCatalogRenderer {
  /**
   * Process an array of A2UI v0.9 messages and return Discord render results.
   */
  render(a2uiMessages: A2UIMessage[]): DiscordRenderResult {
    const result: DiscordRenderResult = { messages: [], modals: [] };

    // Create a fresh processor each time to avoid stale state
    const processor = new MessageProcessor<DiscordComponentApi>([discordCatalog]);

    // Strip `version` field before passing to processor
    const stripped = a2uiMessages.map(msg => {
      const { version, ...rest } = msg;
      return rest;
    });

    processor.processMessages(stripped as any);

    // Iterate over surfaces to find components
    for (const [, surface] of processor.model.surfacesMap) {
      for (const [, componentModel] of surface.componentsModel.entries) {
        const type = componentModel.type;
        const props = componentModel.properties;

        if (type === 'DiscordMessage') {
          result.messages.push(this.renderMessage(props));
        } else if (type === 'DiscordModal') {
          result.modals.push(this.renderModal(props));
        }
      }
    }

    // If no messages produced, return a fallback
    if (result.messages.length === 0 && result.modals.length === 0) {
      result.messages.push({ content: '*No Discord components to render*' });
    }

    return result;
  }

  /**
   * Convenience: render and return the first message options (most common case).
   */
  renderFirstMessage(a2uiMessages: A2UIMessage[]): DiscordMessageOptions {
    const result = this.render(a2uiMessages);
    return result.messages[0] ?? { content: '*No Discord components to render*' };
  }

  // ─── Component Renderers ───

  private renderMessage(props: Record<string, any>): DiscordMessageOptions {
    const opts: DiscordMessageOptions = {};

    if (props.content) {
      opts.content = props.content.slice(0, 2000);
    }

    if (props.embeds?.length) {
      opts.embeds = props.embeds.slice(0, 10).map((e: DiscordEmbedComponent) => this.renderEmbed(e));
    }

    if (props.components?.length) {
      opts.components = props.components.slice(0, 5).map((r: DiscordActionRowComponent) => this.renderActionRow(r));
    }

    if (!opts.content && !opts.embeds?.length && !opts.components?.length) {
      opts.content = '*Empty message*';
    }

    return opts;
  }

  private renderEmbed(comp: DiscordEmbedComponent): EmbedBuilder {
    const embed = new EmbedBuilder();

    if (comp.title) embed.setTitle(comp.title.slice(0, 256));
    if (comp.description) embed.setDescription(comp.description.slice(0, 4096));
    if (comp.color) {
      const color = parseColor(comp.color);
      if (color !== undefined) embed.setColor(color);
    }
    if (comp.fields?.length) {
      for (const field of comp.fields.slice(0, 25)) {
        embed.addFields({
          name: field.name.slice(0, 256),
          value: field.value.slice(0, 1024),
          inline: field.inline ?? false,
        });
      }
    }
    if (comp.thumbnail) embed.setThumbnail(comp.thumbnail);
    if (comp.image) embed.setImage(comp.image);
    if (comp.footer) embed.setFooter({ text: comp.footer.slice(0, 2048) });
    if (comp.timestamp) embed.setTimestamp();

    return embed;
  }

  private renderActionRow(comp: DiscordActionRowComponent): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>();

    for (const child of comp.children ?? []) {
      if (child.component === 'DiscordButton') {
        row.addComponents(this.renderButton(child as DiscordButtonComponent));
      } else if (child.component === 'DiscordSelectMenu') {
        row.addComponents(this.renderSelectMenu(child as DiscordSelectMenuComponent));
      }
    }

    return row;
  }

  private renderButton(comp: DiscordButtonComponent): ButtonBuilder {
    const style = BUTTON_STYLE_MAP[comp.style ?? 'secondary'] ?? ButtonStyle.Secondary;
    const btn = new ButtonBuilder()
      .setLabel(comp.label.slice(0, 80))
      .setStyle(style);

    if (style === ButtonStyle.Link) {
      if (comp.url) btn.setURL(comp.url);
    } else {
      btn.setCustomId(comp.customId ?? comp.id);
    }

    if (comp.emoji) {
      btn.setEmoji(comp.emoji);
    }
    if (comp.disabled) {
      btn.setDisabled(true);
    }

    return btn;
  }

  private renderSelectMenu(comp: DiscordSelectMenuComponent): StringSelectMenuBuilder {
    const select = new StringSelectMenuBuilder()
      .setCustomId(comp.customId);

    if (comp.placeholder) select.setPlaceholder(comp.placeholder);
    if (comp.minValues !== undefined) select.setMinValues(comp.minValues);
    if (comp.maxValues !== undefined) select.setMaxValues(comp.maxValues);

    for (const opt of (comp.options ?? []).slice(0, 25)) {
      const option: { label: string; value: string; description?: string; emoji?: string; default?: boolean } = {
        label: opt.label.slice(0, 100),
        value: opt.value.slice(0, 100),
      };
      if (opt.description) option.description = opt.description.slice(0, 100);
      if (opt.emoji) option.emoji = opt.emoji;
      if (opt.default) option.default = true;
      select.addOptions(option);
    }

    return select;
  }

  private renderModal(props: Record<string, any>): ModalBuilder {
    const modal = new ModalBuilder()
      .setCustomId(props.customId)
      .setTitle(props.title.slice(0, 45));

    for (const field of (props.fields ?? []).slice(0, 5)) {
      const input = this.renderTextInput(field);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(input)
      );
    }

    return modal;
  }

  private renderTextInput(comp: DiscordTextInputComponent): TextInputBuilder {
    const style = comp.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short;
    const input = new TextInputBuilder()
      .setCustomId(comp.customId)
      .setLabel(comp.label.slice(0, 45))
      .setStyle(style);

    if (comp.placeholder) input.setPlaceholder(comp.placeholder.slice(0, 100));
    if (comp.required !== undefined) input.setRequired(comp.required);
    if (comp.value) input.setValue(comp.value);
    if (comp.minLength !== undefined) input.setMinLength(comp.minLength);
    if (comp.maxLength !== undefined) input.setMaxLength(comp.maxLength);

    return input;
  }
}
