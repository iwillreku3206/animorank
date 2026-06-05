<script lang="ts">
  import { onMount } from 'svelte';
  import { createDockview, themeAbyss, DockviewApi } from 'dockview-core';
  import { Window } from '$lib/window/index';
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
      theme: themeAbyss,
      createComponent: (options) => windowMap[options.id].getRenderer()
    });
    openWindow('metadata');
    openWindow('starter_code');
    openWindow('tags');
  });
</script>

/** eslint-disable svelte/no-unused-svelte-ignore */
<div class="flex flex-col flex-1 relative w-full h-full">
  <div
    class="absolute top-0 bottom-0 left-0 right-0"
    bind:this={root}
  ></div>
</div>
