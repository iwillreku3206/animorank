<script lang="ts">
  import ProblemEditor from './ProblemEditor.svelte';
  import DesktopOnly from '$lib/components/layout/DesktopOnly.svelte';
  import type { PageProps } from './$types';

  let props: PageProps = $props();
</script>

<main class="overflow-hidden w-full h-full flex-1 flex flex-col">
  <DesktopOnly
    action="problem editor"
    backHref="/instructor/problemSets"
    backLabel="Back to your problem sets"
  >
    {#key props.data.problem.id}
      <ProblemEditor {...props} />
    {/key}
  </DesktopOnly>
</main>
<!--  bind:problem
  bind:testCases
-->
