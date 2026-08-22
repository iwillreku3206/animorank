<script lang="ts">
  import SolveView from './SolveView.svelte';
  import DesktopOnly from '$lib/components/layout/DesktopOnly.svelte';
  import type { PageProps } from './$types';

  let props: PageProps = $props();
</script>

<main class="overflow-hidden w-full h-full flex-1 flex flex-col">
  <DesktopOnly
    action="practice"
    backHref={props.data.problem.problem_set_id ? `/problemSets/${props.data.problem.problem_set_id}` : '/problemSets'}
  >
    <SolveView {...props} />
  </DesktopOnly>
</main>
