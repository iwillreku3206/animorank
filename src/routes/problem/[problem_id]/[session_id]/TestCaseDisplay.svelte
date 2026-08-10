<script lang="ts">
  import type { TestRunResponse } from './api';
  import TestCaseCard from './TestCaseCard.svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';

  interface Props {
    tests: TestRunResponse;
    testSubmitted?: boolean;
    handleReturn?: () => void;
    selectedTest: number;
    lastTestType: 'run' | 'submit';
  }

  let { tests, testSubmitted = false, selectedTest = $bindable(-1), handleReturn, lastTestType }: Props = $props();

  let publicTests = $derived(tests.results.filter((x) => !x.hidden));

  $effect(() => {
    if (publicTests.length === 0) selectedTest = -1;
    else selectedTest = Math.min(publicTests.length - 1, selectedTest);
  });
</script>

{#if testSubmitted}
  <div class="flex flex-col gap-4 items-center justify-center py-12">
    <div class="text-success text-5xl">✓</div>
    <h2 class="text-2xl font-bold text-success">All test cases passed!</h2>
    <p class="text-gray-400">Congratulations! You've solved this problem.</p>
    {#if handleReturn}
      <Button
        class="btn-primary btn-sm"
        onclick={handleReturn}
      >
        Return to Problem Set
      </Button>
    {/if}
  </div>
{:else if lastTestType === 'run'}
  <div class="flex flex-row h-full">
    {#if tests.results.length > 0 && selectedTest in publicTests}
      <ul class="menu bg-base-200 rounded-box w-56 h-full">
        {#each publicTests as result, i (i)}
          <li class={result.success ? 'text-primary' : 'text-error'}>
            <button onclick={() => (selectedTest = i)}>
              Case {i + 1}
            </button>
          </li>
        {/each}
      </ul>
      <div class="p-4 w-full h-full">
        <TestCaseCard result={publicTests[selectedTest]} />
      </div>
    {:else}
      <div class="p-4 w-full h-full items-center justify-center">No test results yet. Click "Run" to run tests.</div>
    {/if}
  </div>
{:else}
  <div class="flex flex-row gap-2 p-4">
    {#each tests.results as result, i (i)}
      <div class=" bg-base-100 p-2 rounded-lg text-sm flex flex-row gap-4 items-center">
        <span class={result.success ? 'text-primary' : 'text-error'}>Case {i + 1}</span>
        {result.success
          ? 'Passed'
          : result.reason
              .split('_')
              .map((x) => `${x.charAt(0).toUpperCase()}${x.substring(1)}`)
              .join(' ')}
      </div>
    {/each}
  </div>
{/if}
