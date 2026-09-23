<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
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
  import { ClientRegistryProvider } from '$lib/registry/client';
  import { ClientPluginLoader } from '$lib/plugin/clientLoader';
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

    // We intentionally capture the initial values here
    // eslint-disable-next-line svelte/no-unused-svelte-ignore
    // svelte-ignore state_referenced_locally
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

  // The dock mounts only once the context exists, so the manager is built with
  // the real context on its first mount; this effect then hands the context the
  // manager's `openWindow`, which is what lets windows be opened imperatively.
  // The plugins that answer this page's hook are told about it here, after
  // their `openWindow` is usable, and only once.
  let notified = false;
  $effect(() => {
    if (!manager || !context) return;
    context.openWindow = manager.openWindow.bind(manager);

    if (notified) return;
    notified = true;
    void ClientPluginLoader.instance().notifyPageHook('onSolvePageLoad', context);
  });

  // Debounced autosave: every edit to the code sections queues a save, which the
  // status bar in the editor window reports on.
  $effect(() => {
    if (!context) return;
    $state.snapshot(context.editorState.codeSections);
    untrack(() => context?.scheduleSave());
  });

  createHotkey('Control+S', () => void context?.forceSave());

  let resuming = false;
  beforeNavigate((navigation) => {
    // No context yet means nothing has been edited: nothing to flush, and the
    // navigation is safe to let through.
    if (!context || resuming || navigation.type === 'leave' || !navigation.to) return;
    if (context.saveState === 'saved') return;

    navigation.cancel();
    const { href } = navigation.to.url;

    void context!.forceSave().then(() => {
      if (context!.saveState === 'error' && !window.confirm('Your latest changes could not be saved. Leave anyway?')) {
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
      if (!context || untrack(() => context!.saveState) !== 'saved') {
        e.preventDefault();
        return '';
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
      neighbors={data.neighbors}
    />

    <!-- An attempt that never ran. A failing test reports itself in the results
         panel; this is the case where there is no result to show. -->
    {#if context.runError}
      <Alert class="alert-error mx-2 mt-2 shrink-0 py-2">
        <span class="text-sm">{context.runError}</span>
        <Button
          class="btn-ghost btn-xs"
          onclick={() => (context!.runError = null)}
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
  {/if}
</div>
