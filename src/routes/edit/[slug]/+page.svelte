<script lang="ts">
  import ProblemEditor from '$lib/components/problemEditor/ProblemEditor.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  // svelte-ignore state_referenced_locally
  let problem = $state(data.problem);
  // svelte-ignore state_referenced_locally
  let testCases = $state(data.testCases);
</script>

<ProblemEditor
  bind:problem
  bind:testCases
/>
