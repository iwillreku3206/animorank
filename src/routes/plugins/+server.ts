import type { RequestHandler } from './$types';
import { ServerPluginService } from '$lib/plugin/serverService';

// The catalog lists the dynamically loaded plugins this server offers, which
// the browser then fetches from the plugin route on demand. Prebuilt plugins
// ship with the app and are imported through Vite, so they are not listed here.
// Never prerendered: the set of plugins is runtime state.
export const prerender = false;

export const GET: RequestHandler = async () => {
  const plugins = await ServerPluginService.instance().getClientCatalog();

  return new Response(JSON.stringify({ plugins }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=300, must-revalidate'
    }
  });
};
