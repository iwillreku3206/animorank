<script lang="ts">
  import type { TestRunResponse } from '$lib/practiceSession/api';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import CircleCheckIcon from '@iconify-svelte/fa6-solid/circle-check';
  import CircleXmarkIcon from '@iconify-svelte/fa6-solid/circle-xmark';
  import ClockIcon from '@iconify-svelte/fa6-solid/clock';
  import TriangleExclamationIcon from '@iconify-svelte/fa6-solid/triangle-exclamation';
  import VialIcon from '@iconify-svelte/fa6-solid/vial';

  // The iconify components are legacy Svelte class components with a shared
  // signature, so one of them stands in as the type for any of them.
  type IconComponent = typeof VialIcon;

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

<!--
  Shared shell for the panel's non-result states, following the empty-state
  pattern in `layout/DesktopOnly.svelte`: a tinted icon tile, a display-face
  heading, and one muted line of guidance.
-->
{#snippet placeholder(Icon: IconComponent, tone: string, heading: string, body: string)}
  <div class="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
    <div class="grid h-12 w-12 place-items-center rounded-2xl bg-base-200 {tone}">
      <Icon class="h-5 w-5" />
    </div>
    <div class="flex flex-col gap-1">
      <p class="font-display text-base font-semibold text-base-content">{heading}</p>
      <p class="max-w-[34ch] text-sm text-base-content/70">{body}</p>
    </div>
  </div>
{/snippet}

{#if testSubmitted}
  <div class="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
    <div class="grid h-12 w-12 place-items-center rounded-2xl bg-success/15 text-success">
      <CircleCheckIcon class="h-6 w-6" />
    </div>
    <div class="flex flex-col gap-1">
      <p class="font-display text-base font-semibold text-base-content">All test cases passed</p>
      <p class="max-w-[34ch] text-sm text-base-content/70">Nice work — you've solved this problem.</p>
    </div>
    {#if handleReturn}
      <Button
        class="btn-primary btn-sm mt-2"
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
      <div class="p-4 w-full h-full min-w-0 overflow-auto">
        <Display testCaseResult={tests.results[selectedTest]} />
      </div>
    {:else if tests.results.length > 0}
      {@render placeholder(
        TriangleExclamationIcon,
        'text-warning',
        'Result unavailable',
        "This test case ran, but its result can't be displayed here."
      )}
    {:else}
      {@render placeholder(
        VialIcon,
        'text-base-content/50',
        'No results yet',
        'Press Run in the toolbar to check your code against the test cases.'
      )}
    {/if}
  </div>
{:else}
  <!-- Chips wrap rather than run off the panel: a submit reports every case,
       hidden ones included, so the row is easily wider than the tab. -->
  <div class="flex max-h-full flex-row flex-wrap gap-2 overflow-y-auto p-4">
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
