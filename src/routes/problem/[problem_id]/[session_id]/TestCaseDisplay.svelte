<script lang="ts">
  import type { TestRunResponse } from './api';
  import Button from '$lib/components/ui/buttons/Button.svelte';

  interface Props {
    tests: TestRunResponse;
    testSubmitted?: boolean;
    handleReturn?: () => void;
    selectedTest: number;
    lastTestType: 'run' | 'submit';
  }

  let { tests, testSubmitted = false, selectedTest = $bindable(-1), handleReturn, lastTestType }: Props = $props();

  /**
   * Short failure reason for the submit chips, derived from the structured
   * result — restores the Wrong Answer / Compile Error distinction the old
   * UI had. Hidden results have no runInfo/compilerOutput by design, so they
   * can only ever produce the generic "Failed".
   */
  function reasonLabel(result: TestRunResponse['results'][number]): string {
    if (result.success) return 'Passed';
    if ('compilerOutput' in result) return 'Compile Error';
    if (!('runInfo' in result)) return 'Failed';
    const runInfo = result.runInfo as Record<string, unknown>;
    const failure = runInfo.failure;
    if (failure === 'compile_error') return 'Compile Error';
    if (failure === 'timeout') return 'Timed Out';
    if (failure === 'run_error') return 'Run Error';
    if (failure === 'output_not_generated') return 'No Output';
    if (Array.isArray(runInfo.comparisons) && runInfo.comparisons.length > 0) return 'Wrong Answer';
    if ('actual' in runInfo) return 'Wrong Answer';
    if (typeof runInfo.exitCode === 'number') return `Exit ${runInfo.exitCode}`;
    return result.failureReason ?? 'Failed';
  }

  // The backend only sends public test results; the API layer already converts
  // each result to its TestCase class.
  let selectedTestCase = $derived.by(() => {
    if (selectedTest < 0) return null;
    if (selectedTest >= tests.results.length) return tests.results.at(-1)?.testCase ?? null;
    return tests.results[selectedTest].testCase ?? null;
  });

  $effect(() => {
    if (tests.results.length === 0) selectedTest = -1;
    else selectedTest = Math.min(tests.results.length - 1, selectedTest);
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
    {#if selectedTestCase !== null}
      <ul class="menu bg-base-200 rounded-box w-32 min-w-32 h-full flex flex-col flex-nowrap overflow-x-scroll">
        {#each tests.results as result, i (i)}
          <li class={result.success ? 'text-primary' : 'text-error'}>
            <button onclick={() => (selectedTest = i)}>
              Case {i + 1}
            </button>
          </li>
        {/each}
      </ul>
      {@const Display = selectedTestCase.display}
      <div class="p-4 w-full h-full overflow-x-scroll">
        <Display testCaseResult={tests.results[selectedTest]} />
      </div>
    {:else if tests.results.length > 0}
      <div class="p-4 w-full h-full items-center justify-center">
        Test result unavailable — this test case could not be displayed.
      </div>
    {:else}
      <div class="p-4 w-full h-full items-center justify-center">No test results yet. Click "Run" to run tests.</div>
    {/if}
  </div>
{:else}
  <div class="flex flex-row gap-2 p-4">
    {#each tests.results as result, i (i)}
      <div class=" bg-base-100 p-2 rounded-lg text-sm flex flex-row gap-4 items-center">
        <span class={result.success ? 'text-primary' : 'text-error'}>
          {result.testCaseInfo.public ? `Case ${i + 1}` : `Hidden test ${i + 1}`}
        </span>
        {#if result.success}
          <span class="text-success">Passed</span>
        {:else}
          <span
            class="text-error max-w-48 truncate"
            title={'failureReason' in result ? result.failureReason : undefined}
          >
            {reasonLabel(result)}
          </span>
        {/if}
      </div>
    {/each}
  </div>
{/if}
