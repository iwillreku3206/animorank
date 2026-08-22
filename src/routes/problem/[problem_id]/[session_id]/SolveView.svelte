<script lang="ts">
  import DockviewWindow from '$lib/window/DockviewWindow.svelte';
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
      { orientation: 'vertical', children: ['code_editor'] }
    ]
  };

  let manager: DockviewWindowManager<unknown> | undefined = $state();

  $effect(() => {
    if (manager) {
      const openWindow = manager.openWindow.bind(manager);
      context.openWindow = openWindow;
    }
  });
</script>

<DockviewWindow
  bind:context
  {windowRegistry}
  {defaultLayout}
  storageKey={`solve-layout-${data.problem.id}`}
  bind:manager
/>
