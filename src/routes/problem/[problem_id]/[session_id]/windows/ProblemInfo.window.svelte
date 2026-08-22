<script lang="ts">
  import ProblemDescription from '$lib/components/content/ProblemDescription.svelte';
  import type { SolveWindowContext } from '../context.svelte';

  let { context }: { context: SolveWindowContext } = $props();
</script>

<div class="pl-5 pb-10 pt-5 pr-3 overflow-scroll h-full">
  <ProblemDescription problem={context.problem} />
</div>
