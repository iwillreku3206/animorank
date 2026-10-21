<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import type { PageProps } from './$types';
  import Select from '$lib/components/ui/selects/Select.svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import Seo from '$lib/components/layout/Seo.svelte';
  import { selectionHref } from '$lib/analytics/sessionLogParams';
  import { ClientRegistryProvider } from '$lib/registry/client';
  import { ClientPluginLoader } from '$lib/plugin/clientLoader';
  import type { Window } from '$lib/window';
  import { SessionLogsWindowRegistry } from './windowRegistry';
  import { SessionLogsViewContext } from './context.svelte';

  let { data }: PageProps = $props();

  const windowRegistry = ClientRegistryProvider.instance().getRegistry(SessionLogsWindowRegistry);

  // Titles come from the windows' statics, which are safe to read before the
  // windows are built; building them needs the browser (they mount components).
  let tabs = $state(
    await Promise.all(
      windowRegistry.keys().map(async (id) => ({ id, title: (await windowRegistry.getStatic(id)).title }))
    )
  );

  // svelte-ignore state_referenced_locally
  // Seeded from the load and kept current by the effect below.
  const context = new SessionLogsViewContext({
    logs: data.logs,
    problem: data.problem,
    problemSet: data.problemSet,
    document: data.document
  });

  let activeTab = $state('raw_logs');
  let windowMap: Record<string, Window<SessionLogsViewContext>> = $state({});

  // The page stays mounted when only the query changes, so the views follow the
  // selection the load just returned instead of being rebuilt.
  $effect(() => {
    context.setData({
      logs: data.logs,
      problem: data.problem,
      problemSet: data.problemSet,
      document: data.document
    });
  });

  // Cascading levels: picking a parent invalidates every level below it, so its
  // params are cleared with it. `type` is orthogonal and is left untouched.
  function updateParam(key: string, value: string) {
    goto(selectionHref(page.url.pathname, page.url.searchParams, key, value), {
      keepFocus: true,
      noScroll: true,
      replaceState: true
    });
  }

  onMount(async () => {
    await syncTabs();
    context.openView = openView;

    // Every plugin can contribute a view here, and a view only exists once its
    // plugin has loaded, so the page loads them all instead of waiting for
    // something to name them — then picks the views out of the registry.
    await ClientPluginLoader.instance().loadPrebuiltPlugins();
    // The plugins that answer this page's hook are told the page is built, which
    // is how one of them brings its own view forward.
    await ClientPluginLoader.instance().notifyPageHook('onSessionLogsLoad', context);
    await syncTabs();
  });

  /** Build the window for every registry key the page does not show yet. */
  async function syncTabs(): Promise<void> {
    for (const id of await windowRegistry.loadKeys()) {
      if (windowMap[id]) continue;
      windowMap[id] = await windowRegistry.getInstance(id, context);
      if (tabs.some((tab) => tab.id === id)) continue;
      tabs.push({ id, title: (await windowRegistry.getStatic(id)).title });
    }
  }

  async function openView(key: string): Promise<void> {
    await syncTabs();
    if (windowMap[key]) activeTab = key;
  }

  onDestroy(() => {
    for (const window of Object.values(windowMap)) {
      window.destroy();
    }
  });
</script>

<Seo
  title="Session Logs"
  noindex
/>

<div class="flex flex-col gap-6">
  <header class="flex flex-wrap items-baseline justify-between gap-2">
    <h1 class="font-display text-2xl font-bold">Session Logs</h1>
    {#if data.selected.session}
      <span class="text-sm text-base-content/60">{data.logs.length} entries</span>
    {/if}
  </header>

  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <label class="flex flex-col gap-1">
      <span class="text-xs text-base-content/60">Problem set</span>
      <Select
        id="log-set"
        class="select-bordered select-sm w-full"
        value={data.selected.set ?? ''}
        onchange={(e) => updateParam('set', e.currentTarget.value)}
      >
        <option
          value=""
          disabled>Select a problem set</option
        >
        {#each data.problemSets as problemSet (problemSet.id)}
          <option value={problemSet.id}>{problemSet.title}</option>
        {/each}
      </Select>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-xs text-base-content/60">Problem</span>
      <Select
        id="log-problem"
        class="select-bordered select-sm w-full"
        value={data.selected.problem ?? ''}
        disabled={!data.selected.set}
        onchange={(e) => updateParam('problem', e.currentTarget.value)}
      >
        <option
          value=""
          disabled>Select a problem</option
        >
        {#each data.problems as problem (problem.id)}
          <option value={problem.id}>{problem.name}</option>
        {/each}
      </Select>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-xs text-base-content/60">User</span>
      <Select
        id="log-user"
        class="select-bordered select-sm w-full"
        value={data.selected.user ?? ''}
        disabled={!data.selected.problem}
        onchange={(e) => updateParam('user', e.currentTarget.value)}
      >
        <option
          value=""
          disabled>Select a user</option
        >
        {#each data.users as studentId (studentId)}
          <option value={studentId}>{studentId}</option>
        {/each}
      </Select>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-xs text-base-content/60">Session</span>
      <Select
        id="log-session"
        class="select-bordered select-sm w-full"
        value={data.selected.session ?? ''}
        disabled={!data.selected.user}
        onchange={(e) => updateParam('session', e.currentTarget.value)}
      >
        <option
          value=""
          disabled>Select a session</option
        >
        {#each data.sessions as sessionId (sessionId)}
          <option value={sessionId}>{sessionId}</option>
        {/each}
      </Select>
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-xs text-base-content/60">Type</span>
      <div class="flex gap-1">
        <Select
          id="log-type"
          class="select-bordered select-sm w-full"
          value={data.selected.type ?? ''}
          onchange={(e) => updateParam('type', e.currentTarget.value)}
        >
          <option
            value=""
            disabled>Select a type</option
          >
          {#each data.types as type (type)}
            <option value={type}>{type}</option>
          {/each}
        </Select>
        <!-- The type is a filter, not a level: it needs a way back to every
             type that is not a list entry pretending to be one. -->
        {#if data.selected.type}
          <Button
            class="btn-ghost btn-sm"
            onclick={() => updateParam('type', '')}>Clear</Button
          >
        {/if}
      </div>
    </label>
  </div>

  <!-- Every registered view is a tab, whether or not a session is selected: the
       strip is how a reader learns what the page can show. A view only has
       something to render once a session is chosen, so until then the tabs are
       disabled and the content area says what to do. -->
  <div
    class="tabs tabs-lifted tabs-bordered"
    role="tablist"
  >
    {#each tabs as tab (tab.id)}
      <button
        class="tab"
        class:tab-active={activeTab === tab.id}
        class:tab-disabled={!data.selected.session}
        role="tab"
        aria-selected={activeTab === tab.id}
        disabled={!data.selected.session}
        onclick={() => (activeTab = tab.id)}>{tab.title}</button
      >
    {/each}
  </div>

  {#if !data.selected.session}
    <p class="rounded-box bg-base-200 p-8 text-center text-base-content/60">Select a session to see its logs.</p>
  {:else}
    <div class="min-h-64">
      {#if windowMap[activeTab]}
        <div {@attach windowMap[activeTab].getAttachment()}></div>
      {/if}
    </div>
  {/if}
</div>
