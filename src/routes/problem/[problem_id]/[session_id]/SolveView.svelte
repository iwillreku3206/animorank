<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { createHotkey } from '@tanstack/svelte-hotkeys';
  import { beforeNavigate, goto } from '$app/navigation';
  import DockviewWindow from '$lib/window/DockviewWindow.svelte';
  import SolveToolbar from './SolveToolbar.svelte';
  import type { DockviewWindowManager } from '$lib/window/dockviewWindowManager';
  import type { DefaultLayout } from '$lib/window/layout';
  import { Problem } from '$lib/problem';
  import { ClientPracticeSession } from '$lib/practiceSession/clientPracticeSession';
  import { SolveWindowRegistry } from './windowRegistry';
  import { SolveWindowContext } from './context.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const windowRegistry = new SolveWindowRegistry();

  // svelte-ignore state_referenced_locally
  const problem = new Problem(data.problem);
  // svelte-ignore state_referenced_locally
  const practiceSession = new ClientPracticeSession(data.practiceSession, problem, data.user);

  let context = $state(
    new SolveWindowContext({
      problem,
      practiceSession,
      language: data.problem.language.toLowerCase()
    })
  );

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

  $effect(() => {
    if (manager) {
      const openWindow = manager.openWindow.bind(manager);
      context.openWindow = openWindow;
    }
  });

  // Debounced autosave: every edit to the code sections queues a save, which the
  // status bar in the editor window reports on.
  $effect(() => {
    $state.snapshot(context.editorState.codeSections);
    untrack(() => context.scheduleSave());
  });

  createHotkey('Control+S', () => context.forceSave());

  let resuming = false;
  beforeNavigate((navigation) => {
    if (resuming || navigation.type === 'leave' || !navigation.to) return;
    if (context.saveState === 'saved') return;

    navigation.cancel();
    const { href } = navigation.to.url;

    void context.forceSave().then(() => {
      if (context.saveState === 'error' && !window.confirm('Your latest changes could not be saved. Leave anyway?')) {
        return;
      }
      resuming = true;
      void goto(href).finally(() => (resuming = false));
    });
  });

  onMount(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (untrack(() => context.saveState) !== 'saved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  });
</script>

<div class="flex flex-1 flex-col min-h-0">
  <SolveToolbar
    {context}
    user={data.user}
    neighbors={data.neighbors}
  />

  <DockviewWindow
    bind:context
    {windowRegistry}
    {defaultLayout}
    storageKey={`solve-layout-v2-${data.problem.id}`}
    bind:manager
  />
</div>
