import z from 'zod';

export const PluginManifestSchema = z.object({
  id: z.string().nonempty(),
  manifestVersion: z.enum(['0']),
  name: z.string().nonempty(),
  author: z.string().nonempty(),
  description: z.string().optional(),
  category: z.array(z.string()),
  website: z.url().optional(),
  supportUrl: z.url().optional(),
  repository: z.url().optional(),
  version: z.string(),
  clientClass: z.array(z.string()),
  serverClass: z.array(z.string())
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;
