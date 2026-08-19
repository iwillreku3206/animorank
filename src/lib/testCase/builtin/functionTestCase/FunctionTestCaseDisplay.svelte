<script lang="ts">
  import type { Component } from 'svelte';
  import type { TestCaseResult } from '$lib/testCase/types';
  import type { FunctionTestCaseRunInfo } from './functionTestCase.svelte';
  import type { TypeValue } from './typeValue.svelte';

  let { testCaseResult }: { testCaseResult: TestCaseResult<FunctionTestCaseRunInfo> } = $props();

  // runInfo comparisons arrive already hydrated into TypeValue instances by the
  // API layer (TestCase.hydrateRunInfo).
  // ValueDisplay is typed against React's Component in types.ts (pre-existing);
  // the runtime values are Svelte components.
  function displayFor(value: TypeValue): Component {
    return value.type.valueDisplay as unknown as Component;
  }

  function label(symbol: string): string {
    if (symbol === 'return') return 'Return value';
    const param = symbol.match(/^param(\d+)$/);
    if (param) return `param ${param[1]}`;
    const ret = symbol.match(/^return(\d+)$/);
    if (ret) return `Return value ${ret[1]}`;
    return symbol;
  }
</script>

{#if 'runInfo' in testCaseResult}
  <div class="w-full flex flex-col gap-3">
    <div class={testCaseResult.success ? 'text-success' : 'text-error'}>
      {testCaseResult.success ? '✓ Passed' : '✗ Failed'}
    </div>
    {#if testCaseResult.compilerOutput}
      <pre class="text-error text-xs bg-base-100 rounded-lg p-2 overflow-x-auto">{testCaseResult.compilerOutput}</pre>
    {/if}
    {#each testCaseResult.runInfo.comparisons as comparison, i (i)}
      {@const ExpectedDisplay = displayFor(comparison.expected)}
      {@const ActualDisplay = displayFor(comparison.actual)}
      <div class="bg-base-100 flex flex-col gap-2 rounded-lg p-3">
        <div class="flex flex-row items-center gap-2">
          <span class="font-mono text-xs text-base-content opacity-80">{label(comparison.symbol)}</span>
          <span class={comparison.result ? 'text-success' : 'text-error'}>{comparison.result ? '✓' : '✗'}</span>
        </div>
        <div class="flex flex-row items-center gap-2">
          <span class="text-xs text-base-content opacity-80">Expected:</span>
          <ExpectedDisplay value={comparison.expected} />
        </div>
        <div class="flex flex-row items-center gap-2">
          <span class="text-xs text-base-content opacity-80">Actual:</span>
          <ActualDisplay value={comparison.actual} />
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div class="p-4">Hidden test case</div>
{/if}
