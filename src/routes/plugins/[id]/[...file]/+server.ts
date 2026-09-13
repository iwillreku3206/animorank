import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ServerPluginService } from '$lib/plugin/serverService';
import { pluginFileContentType } from '$lib/plugin/catalog';

// The public face of the plugin registry: files are read from loaded plugins,
// never resolved from the URL, so a request cannot reach outside a plugin
// package. Never prerendered: the plugin set is runtime state.
export const prerender = false;

export const GET: RequestHandler = async ({ params }) => {
  const file = await ServerPluginService.instance().readPluginFile(params.id, params.file);
  if (!file) {
    error(404, `Plugin "${params.id}" has no file "${params.file}"`);
  }

  return new Response(new Uint8Array(file), {
    headers: {
      'content-type': pluginFileContentType(params.file),
      // A path alone does not identify a version, so revalidate instead of
      // caching hard: an updated plugin must be picked up without a purge.
      'cache-control': 'public, max-age=0, must-revalidate'
    }
  });
};
