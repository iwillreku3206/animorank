<script lang="ts">
  import SolveView from './SolveView.svelte';
  import DesktopOnly from '$lib/components/layout/DesktopOnly.svelte';
  import { problemSetHref } from '$lib/navigation';
  import type { PageProps } from './$types';

  let props: PageProps = $props();
</script>

<main class="overflow-hidden w-full h-full flex-1 flex flex-col">
  <DesktopOnly
    action="practice"
    backHref={problemSetHref(props.data.problem.problem_set_id)}
  >
    {#key props.data.practiceSession.id}
      <SolveView {...props} />
    {/key}
  </DesktopOnly>
</main>
