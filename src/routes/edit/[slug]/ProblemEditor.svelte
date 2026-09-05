<script lang="ts">
  import { onDestroy } from 'svelte';
  import DockviewWindow from '$lib/window/DockviewWindow.svelte';
  import type { DefaultLayout } from '$lib/window/layout';
  import { ProblemEditorWindowRegistry } from './windowRegistry';
  import { ProblemEditorWindowContext } from './context.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const windowRegistry = new ProblemEditorWindowRegistry();

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

  let context = $state(
    new ProblemEditorWindowContext({
      problem: data.problem,
      testCases: data.testCases,
      tags: data.tags,
      topics: data.topics
    })
  );

  onDestroy(() => {
    context.cleanup();
  });
</script>

save status: {context.autosaveStatus}
<DockviewWindow
  bind:context
  {windowRegistry}
  {defaultLayout}
  storageKey={`problem-editor-${data.problem.id}`}
/>
