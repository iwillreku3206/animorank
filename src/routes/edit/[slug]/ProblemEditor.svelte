<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import DockviewWindow from '$lib/window/DockviewWindow.svelte';
  import { discardSavedLayouts } from '$lib/window/dockviewWindowManager';
  import type { DefaultLayout } from '$lib/window/layout';
  import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
  import EditorToolbar from './EditorToolbar.svelte';
  import { ProblemEditorWindowRegistry } from './windowRegistry';
  import { testCaseWindowId } from './windows/TestCases.window';
  import { ProblemEditorWindowContext } from './context.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const windowRegistry = new ProblemEditorWindowRegistry();

  const testCaseTabs = TestCaseRegistry.instance().keys().map(testCaseWindowId);

  const defaultLayout: DefaultLayout = {
    panes: [
      {
        orientation: 'vertical',
        children: [{ tabs: ['metadata', 'properties'], active: 'metadata' }, 'starter_code']
      },
      {
        orientation: 'vertical',
        children: [{ tabs: ['functions', ...testCaseTabs], active: testCaseTabs[0] ?? 'functions' }]
      }
    ]
  };

  let context = $state(
    new ProblemEditorWindowContext({
      problem: data.problem,
      testCases: data.testCases,
      tags: data.tags,
      topics: data.topics
    })
  );

  // Every superseded layout key, cleared on the way past. A saved layout wins
  // over the default one, so a browser still holding an old key would keep its
  // stale arrangement and never see panels that later defaults introduce --
  // which is why each change to `defaultLayout` comes with a new key, dated the
  // day it landed. Drop each entry once its date is far enough back that every
  // browser holding the key has since loaded the page and had it swept.
  //
  // `problem-editor:v` covers the whole retired `v<number>` convention in one
  // prefix, because a dated key never starts with it. The colon separator is
  // load-bearing: with hyphens the live key would start with `problem-editor-`
  // and this sweep would delete it on every mount.
  const SUPERSEDED_LAYOUT_KEYS = ['problem-editor-', 'problem-editor:v'];
  onMount(() => SUPERSEDED_LAYOUT_KEYS.forEach((key) => discardSavedLayouts(key)));

  onDestroy(() => {
    context.cleanup();
  });
</script>

<div class="flex flex-1 flex-col min-h-0">
  <EditorToolbar
    {context}
    user={data.user}
    neighbors={data.neighbors}
  />

  <DockviewWindow
    bind:context
    {windowRegistry}
    {defaultLayout}
    storageKey={`problem-editor:2026-09-18:${data.problem.id}`}
  />
</div>
