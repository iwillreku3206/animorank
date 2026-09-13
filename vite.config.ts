import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import mkcert from 'vite-plugin-mkcert';
import monacoEditorEsmPlugin from 'vite-plugin-monaco-editor-esm';
import { loadEnv, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';

/** The plugin folder named by the global config, if the config file exists and names one. */
function readConfiguredPluginDir(): string | undefined {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config.json'), 'utf8')) as {
      plugins?: { pluginDir?: unknown };
    };
    const dir = config.plugins?.pluginDir;
    return typeof dir === 'string' && dir.trim() ? dir.trim() : undefined;
  } catch {
    // No config file: there is no dynamic plugin folder to deny.
    return undefined;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const plugins = [monacoEditorEsmPlugin(), sveltekit(), tailwindcss()];

  if (env.SSL_DEV_SERVER === 'true') plugins.push(mkcert() as Plugin);

  const configuredPluginDir = readConfiguredPluginDir();
  const pluginDir = configuredPluginDir ? path.resolve(process.cwd(), configuredPluginDir) : undefined;

  return {
    plugins,
    test: {
      // Plugin packages ship with the app and their tests live beside them, so
      // the suite covers both the app's sources and the `plugins/` packages.
      include: ['src/**/*.{test,spec}.{js,ts}', 'plugins/**/*.{test,spec}.{js,ts}']
    },
    optimizeDeps: {
      include: ['monaco-editor/esm/vs/editor/editor.main']
    },
    server: {
      allowedHosts: true,
      fs: {
        // A plugin's server entry is imported by the loader at runtime, but it
        // is never bundled nor fetched by the browser, so it is denied over
        // HTTP (the plugin route never serves it either). The shared entry
        // stays fetchable: the plugin route serves `global.js` to the browser,
        // and a prebuilt plugin's `global.ts` is imported like its client
        // entry. The prebuilt roots are fixed; the dynamically loaded root is
        // config-driven.
        deny: [
          path.resolve(process.cwd(), 'plugins/*/server.@(js|ts)'),
          path.resolve(process.cwd(), 'src/lib/plugins/*/server.@(js|ts)'),
          ...(pluginDir ? [`${pluginDir}/*/server.@(js|ts)`] : [])
        ]
      }
    },
    ssr: {
      // This tells Vite: "Don't leave these to Node's native ESM loader;
      // bundle them so I can handle the CSS imports."
      noExternal: [
        '@gravity-ui/uikit',
        '@gravity-ui/markdown-editor',
        '@gravity-ui/icons',
        'react-use',
        'monaco-editor'
      ]
    }
  };
});
