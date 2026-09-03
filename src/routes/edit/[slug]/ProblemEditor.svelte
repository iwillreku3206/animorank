<script lang="ts">
  import { onDestroy } from 'svelte';
  import DockviewWindow from '$lib/window/DockviewWindow.svelte';
  import type { DefaultLayout } from '$lib/window/layout';
  import { ClientRegistryProvider } from '$lib/registry/client';
  import { ProblemEditorWindowRegistry } from './windowRegistry';
  import { ProblemEditorWindowContext } from './context.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const windowRegistry = ClientRegistryProvider.instance().getRegistry(ProblemEditorWindowRegistry);

  const defaultLayout: DefaultLayout = {
    panes: [
      {
        orientation: 'vertical',
        children: [{ tabs: ['metadata', 'properties'], active: 'metadata' }, 'starter_code']
      },
      {
        orientation: 'vertical',
        children: [{ tabs: ['functions', 'test_cases'], active: 'test_cases' }]
      }
    ]
  };

  let context = $state<ProblemEditorWindowContext | null>(null);

  $effect(() => {
    if (context) return;
    ProblemEditorWindowContext.create({
      problem: data.problem,
      testCases: data.testCases,
      tags: data.tags,
      topics: data.topics
    }).then((c) => {
      context = c;
    });
  });

  onDestroy(() => {
    context?.cleanup();
  });
</script>

{#if context}
  save status: {context.autosaveStatus}
  <DockviewWindow
    bind:context
    {windowRegistry}
    {defaultLayout}
    storageKey={`problem-editor-${data.problem.id}`}
  />
{/if}
