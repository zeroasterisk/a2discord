/**
 * Discord Catalog definition for A2UI web_core v0.9.
 *
 * Defines typed component APIs with Zod schemas and creates a Catalog instance.
 */

import { Catalog } from '@a2ui/web_core/v0_9';
import type { ComponentApi } from '@a2ui/web_core/v0_9';
import { z } from 'zod';

// ─── Component API Interface ───

export interface DiscordComponentApi extends ComponentApi {
  name: string;
  schema: z.ZodTypeAny;
}

// ─── Component Schemas (properties only — id/component are envelope fields) ───

const DiscordMessageApi: DiscordComponentApi = {
  name: 'DiscordMessage',
  schema: z.object({
    content: z.string().optional(),
    embeds: z.array(z.any()).optional(),
    components: z.array(z.any()).optional(),
    ephemeral: z.boolean().optional(),
  }),
};

const DiscordEmbedApi: DiscordComponentApi = {
  name: 'DiscordEmbed',
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    fields: z.array(z.object({
      name: z.string(),
      value: z.string(),
      inline: z.boolean().optional(),
    })).optional(),
    thumbnail: z.string().optional(),
    image: z.string().optional(),
    footer: z.string().optional(),
    timestamp: z.boolean().optional(),
  }),
};

const DiscordActionRowApi: DiscordComponentApi = {
  name: 'DiscordActionRow',
  schema: z.object({
    children: z.array(z.any()).optional(),
  }),
};

const DiscordButtonApi: DiscordComponentApi = {
  name: 'DiscordButton',
  schema: z.object({
    label: z.string(),
    style: z.enum(['primary', 'secondary', 'success', 'danger', 'link']).optional(),
    customId: z.string().optional(),
    url: z.string().optional(),
    emoji: z.string().optional(),
    disabled: z.boolean().optional(),
  }),
};

const DiscordSelectMenuApi: DiscordComponentApi = {
  name: 'DiscordSelectMenu',
  schema: z.object({
    customId: z.string(),
    placeholder: z.string().optional(),
    minValues: z.number().optional(),
    maxValues: z.number().optional(),
    options: z.array(z.object({
      label: z.string(),
      value: z.string(),
      description: z.string().optional(),
      emoji: z.string().optional(),
      default: z.boolean().optional(),
    })).optional(),
  }),
};

const DiscordModalApi: DiscordComponentApi = {
  name: 'DiscordModal',
  schema: z.object({
    title: z.string(),
    customId: z.string(),
    fields: z.array(z.any()).optional(),
  }),
};

const DiscordTextInputApi: DiscordComponentApi = {
  name: 'DiscordTextInput',
  schema: z.object({
    customId: z.string(),
    label: z.string(),
    style: z.enum(['short', 'paragraph']).optional(),
    placeholder: z.string().optional(),
    required: z.boolean().optional(),
    value: z.string().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
  }),
};

// ─── Catalog ───

const allComponentApis: DiscordComponentApi[] = [
  DiscordMessageApi,
  DiscordEmbedApi,
  DiscordActionRowApi,
  DiscordButtonApi,
  DiscordSelectMenuApi,
  DiscordModalApi,
  DiscordTextInputApi,
];

export const discordCatalog = new Catalog<DiscordComponentApi>(
  'https://github.com/zeroasterisk/a2discord/catalog/v1/discord_catalog.json',
  allComponentApis,
);
