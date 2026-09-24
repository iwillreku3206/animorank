import z from 'zod';

export const PluginManifestSchema = z.object({
  id: z.string().nonempty(),
  manifestVersion: z.enum(['0']),
  name: z.string().nonempty(),
  author: z.string().nonempty(),
  version: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/),
  description: z.string().optional(),
  category: z.array(z.string()),
  website: z.url().optional(),
  supportUrl: z.url().optional(),
  repository: z.url().optional()
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;
