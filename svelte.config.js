//import adapter from '@sveltejs/adapter-vercel';
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // `.svx` files (changelog entries under src/lib/changelog) are compiled as
  // Svelte components via mdsvex. `.svx` is intentionally NOT used inside
  // src/routes so entry files never become their own pages.
  extensions: ['.svelte', '.svx'],

  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: [vitePreprocess(), mdsvex({ extensions: ['.svx'] })],

  kit: {
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: adapter()
  }
};

export default config;
