<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import ReactDOM from 'react-dom/client';
  import { jsx } from 'react/jsx-runtime';
  import React from 'react';

  if (browser) {
    import('@diplodoc/latex-extension/runtime');
  }

  let { text }: { text: string } = $props();

  let viewer = $state<HTMLDivElement>();
  let root = $state<ReactDOM.Root>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let setTextCallback = $state((_text: string) => {});
  $effect(() => {
    setTextCallback(text);
  });

  onMount(() => {
    Promise.all([import('./YfmStaticView.tsx')]).then((modules) => {
      if (browser && viewer) {
        const element = jsx(React.Fragment, {
          children: [
            jsx(modules[0].default, {
              initialText: text,
              setTextCallback: (cb: (_: string) => void) => (setTextCallback = cb)
            })
          ]
        });
        root = ReactDOM.createRoot(viewer);
        root.render(element);
      }
    });
    return () => root?.unmount();
  });
</script>

<div bind:this={viewer}>Loading Markdown...</div>

<style>
</style>
