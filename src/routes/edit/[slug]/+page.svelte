<script lang="ts">
  //import ProblemEditor from '$lib/components/problemEditor/ProblemEditor.svelte';
  import ProblemEditor from './ProblemEditor.svelte';
  import type { PageProps } from './$types';

  let props: PageProps = $props();
</script>

<main class="overflow-hidden w-full h-full flex-1 flex flex-col">
  <ProblemEditor {...props} />
</main>
<!--  bind:problem
  bind:testCases
-->
