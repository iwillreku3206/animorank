import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import monacoEditorEsmPlugin from 'vite-plugin-monaco-editor-esm'

export default defineConfig({
  plugins: [monacoEditorEsmPlugin(), sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}']
  },
  optimizeDeps: {
    include: ['monaco-editor/esm/vs/editor/editor.main']
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
});
