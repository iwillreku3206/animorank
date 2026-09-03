<script lang="ts">
  import type { TestRunResponse } from './api';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import CircleCheckIcon from '@iconify-svelte/fa6-solid/circle-check';
  import CircleXmarkIcon from '@iconify-svelte/fa6-solid/circle-xmark';
  import ClockIcon from '@iconify-svelte/fa6-solid/clock';
  import TriangleExclamationIcon from '@iconify-svelte/fa6-solid/triangle-exclamation';

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

  /**
   * Icon for the case list, grouped by the same outcome classes reasonLabel
   * distinguishes: a clock for timeouts, a warning triangle for the code never
   * running (compile/run error), and a plain cross for a wrong answer.
   */
  function statusIcon(result: TestRunResponse['results'][number]) {
    if (result.success) return CircleCheckIcon;
    if ('compilerOutput' in result) return TriangleExclamationIcon;
    if (!('runInfo' in result)) return CircleXmarkIcon;
    const failure = (result.runInfo as Record<string, unknown>).failure;
    if (failure === 'timeout') return ClockIcon;
    if (failure === 'compile_error' || failure === 'run_error') return TriangleExclamationIcon;
    return CircleXmarkIcon;
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
      <ul class="flex h-full w-36 min-w-36 flex-col flex-nowrap overflow-x-hidden overflow-y-auto p-4">
        {#each tests.results as result, i (i)}
          {@const Icon = statusIcon(result)}
          {@const active = selectedTest === i}
          <li>
            <Button
              class="btn-ghost btn-sm w-full justify-start gap-2 {result.success
                ? 'text-success'
                : 'text-error'} {active ? 'btn-active bg-base-100' : ''}"
              aria-current={active ? 'true' : undefined}
              onclick={() => (selectedTest = i)}
            >
              <Icon
                class="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span class="truncate">Case {i + 1}</span>
            </Button>
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
