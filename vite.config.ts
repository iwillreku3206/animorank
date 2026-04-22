import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import mkcert from 'vite-plugin-mkcert'
import monacoEditorEsmPlugin from 'vite-plugin-monaco-editor-esm'
import { loadEnv, type Plugin } from 'vite';
import tailwindcss from "@tailwindcss/vite";


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const plugins = [monacoEditorEsmPlugin(), sveltekit(), tailwindcss()]

  if (env.SSL_DEV_SERVER === 'true')
    plugins.push(mkcert() as Plugin)
  return {
    plugins,
    test: {
      include: ['src/**/*.{test,spec}.{js,ts}']
    },
    optimizeDeps: {
      include: ['monaco-editor/esm/vs/editor/editor.main']
    },
    server: {
      allowedHosts: true
    },
    ssr: {
      // This tells Vite: "Don't leave these to Node's native ESM loader; 
      // bundle them so I can handle the CSS imports."
      noExternal: [
        '@gravity-ui/uikit',
        '@gravity-ui/markdown-editor',
        "@gravity-ui/icons",
        "react-use",
        "monaco-editor"
      ]
    }
  }
});
