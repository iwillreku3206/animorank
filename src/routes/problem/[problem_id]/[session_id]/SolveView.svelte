<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import { createHotkey } from '@tanstack/svelte-hotkeys';
  import DockviewWindow from '$lib/window/DockviewWindow.svelte';
  import SolveToolbar from './SolveToolbar.svelte';
  import type { DockviewWindowManager } from '$lib/window/dockviewWindowManager';
  import type { DefaultLayout } from '$lib/window/layout';
  import { Problem } from '$lib/problem';
  import { ClientPracticeSession } from '$lib/practiceSession/clientPracticeSession';
  import { ClientRegistryProvider } from '$lib/registry/client';
  import { SolveWindowRegistry } from './windowRegistry';
  import { SolveWindowContext } from './context.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const windowRegistry = ClientRegistryProvider.instance().getRegistry(SolveWindowRegistry);

  // svelte-ignore state_referenced_locally
  const problem = new Problem(data.problem);
  // svelte-ignore state_referenced_locally
  const practiceSession = new ClientPracticeSession(data.practiceSession, problem, data.user);

  let context = $state<SolveWindowContext | null>(null);

  // Initialisation must not be reactive, for the same reason as the editor: the
  // props would become a dependency of the effect, and `context` stays null
  // while the creation is in flight, so the guard cannot stop a second run.
  let initializing = false;
  let destroyed = false;

  // Read once, outside the effect, so the effect has no dependencies at all.
  const initialValues = {
    problem,
    practiceSession,
    language: data.problem.language.toLowerCase()
  };

  $effect(() => {
    if (initializing || context) return;
    initializing = true;
    void SolveWindowContext.create(initialValues).then((created) => {
      if (destroyed) return;
      context = created;
      initializing = false;
    });
  });

  const defaultLayout: DefaultLayout = {
    panes: [
      { orientation: 'vertical', children: ['problem_info'] },
      {
        orientation: 'vertical',
        children: ['code_editor', { tabs: ['test_cases', 'custom_code'], active: 'test_cases' }],
        weights: [2, 1]
      }
    ]
  };

  let manager: DockviewWindowManager<unknown> | undefined = $state();

  // The dock mounts only once the context exists, so the manager is built with
  // the real context on its first mount; this effect then hands the context the
  // manager's `openWindow`, which is what lets windows be opened imperatively.
  $effect(() => {
    if (!manager || !context) return;
    context.openWindow = manager.openWindow.bind(manager);
  });

  // Debounced autosave: every edit to the code sections queues a save, which the
  // status bar in the editor window reports on.
  $effect(() => {
    if (!context) return;
    $state.snapshot(context.editorState.codeSections);
    untrack(() => context?.scheduleSave());
  });

  createHotkey('Control+S', () => void context?.forceSave());

  onMount(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!context || untrack(() => context.saveState) !== 'saved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  onDestroy(() => {
    destroyed = true;
  });
</script>

<div class="flex flex-1 flex-col min-h-0">
  {#if context}
    <SolveToolbar
      {context}
      user={data.user}
    />

    <DockviewWindow
      bind:context
      {windowRegistry}
      {defaultLayout}
      storageKey={`solve-layout-v2-${data.problem.id}`}
      bind:manager
    />
  {/if}
</div>
