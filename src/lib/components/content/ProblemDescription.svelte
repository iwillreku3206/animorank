<script lang="ts">
  import transform from '@diplodoc/transform';
  import YfmStaticView from '$lib/components/content/YfmStaticView.svelte';
  import { transform as latex } from '@diplodoc/latex-extension/plugin';
  import { transform as mermaid } from '@diplodoc/mermaid-extension/plugin';
  import { transform as transformHTML } from '@diplodoc/html-extension';
  import defaultPlugins from '@diplodoc/transform/lib/plugins';
  import { browser } from '$app/environment';
  import type { Problem } from '$lib/problem';

  let { problem }: { problem: Problem } = $props();

  if (browser) {
    import('@diplodoc/latex-extension/runtime');
  }

  const html = $derived(
    transform(problem.description, {
      allowHTML: true,
      plugins: [
        latex({
          bundle: false,
          runtime: 'extension:latex'
        }),
        mermaid({
          bundle: false,
          runtime: 'extension:mermaid'
        }),
        transformHTML({
          bundle: false,
          runtimeJsPath: 'extension:html'
        }),
        ...defaultPlugins
      ]
    }).result.html
  );
</script>

<h2 class="text-2xl">{problem.name}</h2>
<div>
  <YfmStaticView {html} />
</div>
