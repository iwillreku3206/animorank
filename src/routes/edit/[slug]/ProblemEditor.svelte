<script lang="ts">
  import { onMount } from 'svelte';
  import { createDockview, DockviewApi } from 'dockview-core';
  import { Window } from '$lib/window/index';
  import { themeAnimoRank } from '$lib/window/animorank-theme';
  import { ProblemEditorWindowRegistry } from './windowRegistry';
  import { ProblemEditorWindowContext } from './context.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  let root: HTMLDivElement | undefined = $state();
  let dockview: DockviewApi | undefined = $state();

  const windowRegistry = new ProblemEditorWindowRegistry();

  const windowMap: Record<string, Window<ProblemEditorWindowContext>> = {};

  let context = $state(
    new ProblemEditorWindowContext({
      problem: data.problem,
      testCases: data.testCases,
      tags: data.tags,
      topics: data.topics
    })
  );

  function openWindow(key: string) {
    if (key in windowMap) {
      dockview?.getPanel(key)?.api.setActive();
      return windowMap[key];
    }
    windowMap[key] = windowRegistry.getInstance(key, context);
    dockview?.addPanel({ id: key, title: windowMap[key].title, component: 'default' });
  }

  onMount(() => {
    dockview = createDockview(root!, {
      theme: themeAnimoRank,
      createComponent: (options) => windowMap[options.id].getRenderer()
    });
    openWindow('metadata');
    openWindow('starter_code');
    openWindow('properties');
    openWindow('test_cases');
  });
</script>

save status: {context.autosaveStatus}
<div class="relative w-full h-full flex flex-1 flex-col">
  <div
    class="absolute top-2 bottom-2 left-2 right-2"
    bind:this={root}
  ></div>
</div>
