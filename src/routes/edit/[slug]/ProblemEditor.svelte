<script lang="ts">
  import { onDestroy } from 'svelte';
  import DockviewWindow from '$lib/window/DockviewWindow.svelte';
  import type { DefaultLayout } from '$lib/window/layout';
  import { ClientRegistryProvider } from '$lib/registry/client';
  import { ClientPluginLoader } from '$lib/plugin/clientLoader';
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

  // Initialisation must not be reactive. Reading `data.*` inside an effect makes
  // it a dependency, and because `context` is only assigned once the async
  // creation resolves, the `if (context)` guard cannot stop a second run while
  // the first is still in flight — a re-render then starts a *second* creation,
  // each with its own effect root, and the batches they schedule compound until
  // Svelte trips `effect_update_depth_exceeded`.
  let initializing = false;
  let destroyed = false;

  // The props are read once, here — not inside the effect — so the effect has no
  // dependency at all and cannot re-run itself.
  const initialValues = {
    problem: data.problem,
    testCases: data.testCases,
    tags: data.tags,
    topics: data.topics
  };

  $effect(() => {
    if (initializing || context) return;
    initializing = true;
    void ProblemEditorWindowContext.create(initialValues).then((created) => {
      if (destroyed) {
        created.cleanup();
        return;
      }
      context = created;
      initializing = false;
      void ClientPluginLoader.instance().notifyPageHook('onProblemEditorLoad', created);
    });
  });

  onDestroy(() => {
    destroyed = true;
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
