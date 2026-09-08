<script lang="ts">
  import ProblemDescription from '$lib/components/content/ProblemDescription.svelte';
  import type { SolveWindowContext } from '../context.svelte';

  let { context }: { context: SolveWindowContext } = $props();
</script>

<div class="h-full min-w-0 overflow-x-hidden overflow-y-auto pl-5 pb-10 pt-5 pr-3">
  <ProblemDescription problem={context.problem} />
</div>
