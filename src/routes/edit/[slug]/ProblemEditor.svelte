<script lang="ts">
  import { onDestroy } from 'svelte';
  import DockviewWindow from '$lib/window/DockviewWindow.svelte';
  import type { DockviewWindowManager } from '$lib/window/dockviewWindowManager';
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
  let manager: DockviewWindowManager<unknown> | undefined = $state();

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
    // We intentionally capture initial values here
    // eslint-disable-next-line svelte/no-unused-svelte-ignore
    // svelte-ignore state_referenced_locally
    problem: data.problem,
    // eslint-disable-next-line svelte/no-unused-svelte-ignore
    // svelte-ignore state_referenced_locally
    testCases: data.testCases,
    // eslint-disable-next-line svelte/no-unused-svelte-ignore
    // svelte-ignore state_referenced_locally
    tags: data.tags,
    // eslint-disable-next-line svelte/no-unused-svelte-ignore
    // svelte-ignore state_referenced_locally
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
    });
  });

  // The dock mounts only once the context exists, so the manager is built with
  // the real context on its first mount; this effect then hands the context the
  // manager's `openWindow`, which is what lets windows be opened imperatively.
  // The plugins that answer this page's hook are told about it here — after
  // their `openWindow` is usable, never before the dock exists — and only once.
  let notified = false;
  $effect(() => {
    if (!manager || !context) return;
    context.openWindow = manager.openWindow.bind(manager);

    if (notified) return;
    notified = true;
    void ClientPluginLoader.instance().notifyPageHook('onProblemEditorLoad', context);
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
    bind:manager
  />
{/if}
