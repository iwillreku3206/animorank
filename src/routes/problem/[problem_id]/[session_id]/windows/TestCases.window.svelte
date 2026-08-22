<script lang="ts">
  import { goto } from '$app/navigation';
  import TestCaseDisplay from '$lib/components/solve/TestCaseDisplay.svelte';
  import type { SolveWindowContext } from '../context.svelte';

  let { context }: { context: SolveWindowContext } = $props();

  const handleReturn = () => {
    const problemSetId = context.problem.model.problem_set_id;
    if (problemSetId) {
      goto(`/problemSets/${problemSetId}`);
    } else {
      goto('/problemSets');
    }
  };
</script>

<div class="h-full">
  <TestCaseDisplay
    tests={context.testCaseResults}
    testSubmitted={context.testSubmitted}
    bind:selectedTest={context.selectedTest}
    lastTestType={context.lastTestType}
    {handleReturn}
  />
</div>
