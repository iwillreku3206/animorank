<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import DockviewWindow from '$lib/window/DockviewWindow.svelte';
  import { discardSavedLayouts } from '$lib/window/dockviewWindowManager';
  import type { DefaultLayout } from '$lib/window/layout';
  import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
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

  onMount(() => discardSavedLayouts('problem-editor-'));

  onDestroy(() => {
    context.cleanup();
  });
</script>

save status: {context.autosaveStatus}
<DockviewWindow
  bind:context
  {windowRegistry}
  {defaultLayout}
  storageKey={`problem-editor:v2:${data.problem.id}`}
/>
