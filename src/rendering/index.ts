/**
 * Discord renderer — converts A2UI v0.9 messages (Discord catalog) to Discord message options.
 */

export { DiscordCatalogRenderer } from './a2ui-renderer.js';

// Re-export the old renderer for backward compat
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { A2AMessage, A2HIntent, DiscordMessageOptions, Part } from '../types.js';

const DISCORD_MAX_CONTENT = 2000;
const COLOR_BLUE = 0x3498db;
const COLOR_GREEN = 0x2ecc71;
const COLOR_RED = 0xe74c3c;
const COLOR_ORANGE = 0xe67e22;

export class DiscordRenderer {
  render(a2aMessage: A2AMessage): DiscordMessageOptions {
    const intent = a2aMessage.metadata?.intent as A2HIntent | undefined;

    switch (intent) {
      case 'INFORM':
        return this.renderInform(a2aMessage);
      case 'AUTHORIZE':
        return this.renderAuthorize(a2aMessage);
      case 'RESULT':
        return this.renderResult(a2aMessage);
      case 'COLLECT':
        return this.renderCollect(a2aMessage);
      default:
        return this.renderPlain(a2aMessage);
    }
  }

  renderEmbed(content: string, metadata?: Record<string, unknown>): EmbedBuilder {
    const embed = new EmbedBuilder().setDescription(content.slice(0, 4096));
    if (metadata) {
      const fields = Object.entries(metadata)
        .filter(([k]) => !['intent', 'action', 'buttons', 'schema', 'success'].includes(k))
        .map(([name, value]) => ({
          name,
          value: typeof value === 'string' ? value : JSON.stringify(value),
          inline: true,
        }));
      if (fields.length > 0) {
        embed.addFields(fields.slice(0, 25));
      }
    }
    return embed;
  }

  renderButtons(actions: string[]): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const action of actions) {
      const isApprove = action === 'approve';
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`a2discord-${action}`)
          .setLabel(action.charAt(0).toUpperCase() + action.slice(1))
          .setStyle(isApprove ? ButtonStyle.Success : ButtonStyle.Danger)
      );
    }
    return row;
  }

  renderError(error: Error): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle('❌ Error')
      .setDescription(error.message.slice(0, 4096))
      .setColor(COLOR_RED)
      .setTimestamp();
  }

  private renderPlain(msg: A2AMessage): DiscordMessageOptions {
    const text = this.extractText(msg.parts);
    const dataParts = msg.parts.filter((p) => p.type === 'data');
    if (dataParts.length > 0) {
      const embed = new EmbedBuilder().setColor(COLOR_BLUE);
      if (text) embed.setDescription(text.slice(0, 4096));
      for (const dp of dataParts) {
        const json = JSON.stringify(dp.data, null, 2);
        embed.addFields({ name: 'Data', value: `\`\`\`json\n${json.slice(0, 1018)}\n\`\`\``, inline: false });
      }
      return { embeds: [embed] };
    }
    if (text.length <= DISCORD_MAX_CONTENT) {
      return { content: text };
    }
    const embed = new EmbedBuilder().setDescription(text.slice(0, 4096)).setColor(COLOR_BLUE);
    return { embeds: [embed] };
  }

  private renderInform(msg: A2AMessage): DiscordMessageOptions {
    const text = this.extractText(msg.parts);
    const embed = this.renderEmbed(text, msg.metadata).setColor(COLOR_BLUE).setTitle('ℹ️ Information');
    return { embeds: [embed] };
  }

  private renderAuthorize(msg: A2AMessage): DiscordMessageOptions {
    const text = this.extractText(msg.parts);
    const action = (msg.metadata?.action as string) ?? 'perform action';
    const buttons = (msg.metadata?.buttons as string[]) ?? ['approve', 'deny'];
    const embed = new EmbedBuilder()
      .setTitle('🔐 Authorization Required')
      .setDescription(text.slice(0, 4096))
      .setColor(COLOR_ORANGE)
      .addFields({ name: 'Action', value: action, inline: false });
    const row = this.renderButtons(buttons);
    return { embeds: [embed], components: [row] };
  }

  private renderResult(msg: A2AMessage): DiscordMessageOptions {
    const text = this.extractText(msg.parts);
    const success = msg.metadata?.success !== false;
    const embed = new EmbedBuilder()
      .setTitle(success ? '✅ Result' : '❌ Result')
      .setDescription(text.slice(0, 4096))
      .setColor(success ? COLOR_GREEN : COLOR_RED)
      .setTimestamp();
    return { embeds: [embed] };
  }

  private renderCollect(msg: A2AMessage): DiscordMessageOptions {
    const text = this.extractText(msg.parts);
    const embed = new EmbedBuilder().setTitle('📝 Input Required').setDescription(text.slice(0, 4096)).setColor(COLOR_ORANGE);
    const schema = msg.metadata?.schema as { fields?: { name: string; label: string; required?: boolean }[] } | undefined;
    if (schema?.fields) {
      for (const field of schema.fields.slice(0, 25)) {
        embed.addFields({ name: field.label || field.name, value: field.required ? '*(required)*' : '*(optional)*', inline: true });
      }
    }
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('a2discord-collect-respond').setLabel('Provide Info').setStyle(ButtonStyle.Primary)
    );
    return { embeds: [embed], components: [row] };
  }

  private extractText(parts: Part[]): string {
    return parts.filter((p) => p.type === 'text' && p.text).map((p) => p.text!).join('\n');
  }
}
