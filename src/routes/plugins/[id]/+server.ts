import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ServerPluginService } from '$lib/plugin/serverPluginService';

// One plugin's browser-facing descriptor: the files the client runs and where
// it fetches them — the files this route serves for a dynamically loaded
// plugin, or the client build's chunks for a prebuilt one. The plugins of this
// server are never listed: the client asks for the plugin id a registry
// resolves to and gets that plugin alone. Never prerendered: the plugin set is
// runtime state.
export const prerender = false;

export const GET: RequestHandler = async ({ params }) => {
  const descriptor = await ServerPluginService.instance().getClientDescriptor(params.id);
  if (!descriptor) {
    error(404, `Plugin "${params.id}" has no client entry`);
  }

  return json(descriptor, {
    headers: {
      // An id alone does not identify a version, so revalidate instead of
      // caching hard: an updated plugin must be picked up without a purge.
      'cache-control': 'public, max-age=0, must-revalidate'
    }
  });
};
