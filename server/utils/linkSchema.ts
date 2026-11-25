import { z } from "zod";
import { isValidSlug } from "#shared/utils/slug";

export const linkSchema = z.object({
  description: z.string().trim().max(500).default(""),
  enabled: z.boolean().default(true),
  listed: z.boolean().default(true),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine(isValidSlug, "Invalid or reserved slug"),
  url: z.url({ protocol: /^https?$/ }).max(2048),
});

export const linkUpdateSchema = linkSchema.partial();
