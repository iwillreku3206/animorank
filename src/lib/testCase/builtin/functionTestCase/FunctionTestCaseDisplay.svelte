<script lang="ts">
  import type { Component } from 'svelte';
  import type { TestCaseResult } from '$lib/testCase/types';
  import type { FunctionTestCase, FunctionTestCaseRunInfo } from './functionTestCase.svelte';
  import type { TypeValue } from './typeValue.svelte';
  import CircleCheckIcon from '@iconify-svelte/fa6-solid/circle-check';
  import CircleXmarkIcon from '@iconify-svelte/fa6-solid/circle-xmark';
  import ValueField from '../shared/ValueField.svelte';
  import HiddenTestCase from '../shared/HiddenTestCase.svelte';

  // api.ts attaches the hydrated TestCase to every public result; it just
  // isn't part of TestCaseResult. It is what carries the comparison
  // operators and the parameter names — runInfo has neither.
  type Result = TestCaseResult<FunctionTestCaseRunInfo> & { testCase?: FunctionTestCase };

  let { testCaseResult }: { testCaseResult: Result } = $props();

  // runInfo comparisons arrive already hydrated into TypeValue instances by the
  // API layer (TestCase.hydrateRunInfo).
  // ValueDisplay is typed against React's Component in types.ts (pre-existing);
  // the runtime values are Svelte components.
  function displayFor(value: TypeValue): Component {
    return value.type.valueDisplay as unknown as Component;
  }

  const testCase = $derived(testCaseResult.testCase);

  /**
   * Parameter names by position, definition first — it is authoritative, the
   * same reason the constructor prefers its types. Both sources are optional
   * and routinely the empty string, so blanks are normalised away here rather
   * than being mistaken for names downstream.
   */
  const parameterNames = $derived.by(() => {
    if (!testCase) return [];
    const definition = testCase.problem.functionData.functions[testCase.data.function];
    return testCase.data.parameters.map(
      (parameter, i) => definition?.parameters[i]?.name?.trim() || parameter.name?.trim() || ''
    );
  });

  // The run endpoint emits one result per definition comparison, in order
  // (see languages/c/c.ts), so index alignment is exact. Matching on symbol
  // would be ambiguous — two comparisons can share one (`> 5` and `< 10` on
  // the same return value).
  const operators = $derived(testCase?.data.comparisons.map((c) => c.operator.describeExpectation) ?? []);

  function label(symbol: string): string {
    if (symbol === 'return') return 'Return value';
    const param = symbol.match(/^param(\d+)$/);
    if (param) {
      const index = Number(param[1]);
      // Counted from 1, matching how the parameter reads in a signature —
      // `param1` is the second one.
      return parameterNames[index] || `Parameter ${index + 1}`;
    }
    const ret = symbol.match(/^return(\d+)$/);
    if (ret) return `Return value ${ret[1]}`;
    return symbol;
  }

  const failureLabels: Record<string, string> = {
    compile_error: 'Compilation failed',
    output_not_generated: 'Output not generated',
    run_error: 'Runtime error',
    timeout: 'Timed out'
  };
</script>

{#if 'runInfo' in testCaseResult}
  <div class="flex w-full flex-col gap-4">
    {#if testCaseResult.compilerOutput}
      <ValueField
        label="Compiler output"
        value={testCaseResult.compilerOutput}
        tone="error"
      />
    {/if}
    {#if testCaseResult.failureReason}
      <ValueField
        label="Failure reason"
        value={testCaseResult.failureReason}
        tone="error"
      />
    {/if}

    {#if 'failure' in testCaseResult.runInfo}
      <ValueField
        label="Result"
        value={failureLabels[testCaseResult.runInfo.failure] ?? testCaseResult.runInfo.failure}
        tone="error"
      />
      {#if testCaseResult.runInfo.exitCode !== undefined}
        <ValueField
          label="Exit code"
          value={String(testCaseResult.runInfo.exitCode)}
        />
      {/if}
      {#if testCaseResult.runInfo.stderr}
        <ValueField
          label="Stderr"
          value={testCaseResult.runInfo.stderr}
          tone="error"
        />
      {/if}
    {:else}
      {#each testCaseResult.runInfo.comparisons as comparison, i (i)}
        {@const Expected = displayFor(comparison.expected)}
        {@const Actual = displayFor(comparison.actual)}
        <div class="flex flex-col gap-2">
          <div class="flex flex-row items-center gap-1.5">
            <span class="text-xs font-medium tracking-wide text-base-content/50">{label(comparison.symbol)}</span>
            {#if comparison.result}
              <CircleCheckIcon
                class="h-3 w-3 text-success"
                aria-hidden="true"
              />
            {:else}
              <CircleXmarkIcon
                class="h-3 w-3 text-error"
                aria-hidden="true"
              />
            {/if}
            <span class="sr-only">{comparison.result ? 'Passed' : 'Failed'}</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1 overflow-x-auto rounded-lg bg-base-100 px-3 py-2">
              <span class="text-xs font-medium tracking-wide text-base-content/50">Expected</span>
              <div class="flex flex-row items-center gap-1 font-mono text-xs leading-relaxed text-base-content">
                {#if operators[i]}<span class="text-base-content/70">{operators[i]}</span>{/if}
                <Expected value={comparison.expected} />
              </div>
            </div>
            <div class="flex flex-col gap-1 overflow-x-auto rounded-lg bg-base-100 px-3 py-2">
              <span class="text-xs font-medium tracking-wide text-base-content/50">Actual</span>
              <div class="flex flex-row items-center gap-1 font-mono text-xs leading-relaxed text-base-content">
                <Actual value={comparison.actual} />
              </div>
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
{:else}
  <HiddenTestCase />
{/if}
