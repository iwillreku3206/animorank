<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { createHotkey } from '@tanstack/svelte-hotkeys';
  import { beforeNavigate, goto } from '$app/navigation';
  import DockviewWindow from '$lib/window/DockviewWindow.svelte';
  import Alert from '$lib/components/ui/alerts/Alert.svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import SolveToolbar from './SolveToolbar.svelte';
  import { discardSavedLayouts, type DockviewWindowManager } from '$lib/window/dockviewWindowManager';
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
      {
        orientation: 'vertical',
        children: [{ tabs: ['problem_info', 'submissions'], active: 'problem_info' }]
      },
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

  // Every superseded layout key, cleared on the way past. A saved layout wins
  // over the default one, so a browser still holding an old key would keep its
  // stale arrangement and never see panels that later defaults introduce --
  // which is why each change to `defaultLayout` comes with a new key, dated the
  // day it landed. Drop each entry once its date is far enough back that every
  // browser holding the key has since loaded the page and had it swept.
  //
  // `solve-layout-v` covers the whole retired `v<number>` convention in one
  // prefix -- `solve-layout-v2-<id>` (the only one saved per problem) through
  // `solve-layout-v5` -- because a dated key never starts with it.
  const SUPERSEDED_LAYOUT_KEYS = ['solve-layout-v'];
  onMount(() => SUPERSEDED_LAYOUT_KEYS.forEach((key) => discardSavedLayouts(key)));

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

  <!-- An attempt that never ran. A failing test reports itself in the results
       panel; this is the case where there is no result to show. -->
  {#if context.runError}
    <Alert class="alert-error mx-2 mt-2 shrink-0 py-2">
      <span class="text-sm">{context.runError}</span>
      <Button
        class="btn-ghost btn-xs"
        onclick={() => (context.runError = null)}
      >
        Dismiss
      </Button>
    </Alert>
  {/if}

  <DockviewWindow
    bind:context
    {windowRegistry}
    {defaultLayout}
    storageKey="solve-layout-2026-09-18"
    bind:manager
  />
</div>
