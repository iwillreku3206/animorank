<script lang="ts">
  import type { TestCaseResult } from '$lib/testCase/testCase';
  import { TypeRegistry } from '$lib/testCase/typeRegistry';
  import {
    ProblemTestCaseType,
    type CustomTestCase,
    type FunctionOutputTestCase,
    type ProgramIOTestCase
  } from '$lib/zenstack/models';

  let { result }: { result: TestCaseResult } = $props();

  type Input = { symbol: string; value: string };
  type Output = { symbol: string; actual: string; expected: string };
  type InputGetter = (_result: TestCaseResult) => Input[];
  type OutputGetter = (_result: TestCaseResult) => Output[];

  const getFunctionOutputInput: InputGetter = (result) => {
    if (result.hidden) return [];
    return (result.testCaseInfo as FunctionOutputTestCase).parameters.map((p, i) => {
      const registry = TypeRegistry.instance();
      const tv = registry.getInstance(p.type, p.data ?? undefined);
      return {
        value: tv.getLanguage('c').constructExpression(),
        symbol: `param ${i + 1}`
      };
    });
  };

  const getFunctionOutputOutput: OutputGetter = (result) => {
    if (result.hidden) return [];
    return result.runInfo.map((tc) => ({
      symbol: tc.symbol,
      actual: tc.actual,
      expected: tc.expected
    }));
  };

  const getProgramIOInput: InputGetter = (result) => {
    if (result.hidden) return [];
    return [{ symbol: 'stdin', value: (result.testCaseInfo as ProgramIOTestCase).input }];
  };

  const getProgramIOOutput: OutputGetter = (result) => {
    if (result.hidden) return [];
    return [
      {
        symbol: 'stdout',
        expected: (result.testCaseInfo as ProgramIOTestCase).output,
        actual: result.runInfo[0]?.actual || ''
      }
    ];
  };

  const getCustomInput: InputGetter = (result) => {
    if (result.hidden) return [];
    return [{ symbol: 'test code', value: (result.testCaseInfo as CustomTestCase).test_code }];
  };

  const getCustomOutput: OutputGetter = () => {
    return [];
  };

  const getIO = (result: TestCaseResult) => {
    if (result.hidden) return { inputs: [], outputs: [] };
    const getters = (
      {
        [ProblemTestCaseType.FunctionOutputTestCase]: [
          getFunctionOutputInput,
          getFunctionOutputOutput
        ],
        [ProblemTestCaseType.ProgramIOTestCase]: [getProgramIOInput, getProgramIOOutput],
        [ProblemTestCaseType.CustomTestCase]: [getCustomInput, getCustomOutput]
      } as Record<ProblemTestCaseType, [InputGetter, OutputGetter]>
    )[result.testCaseInfo.type];

    return {
      inputs: getters[0](result),
      outputs: getters[1](result)
    };
  };
</script>

<div class="w-full flex flex-col gap-6">
  {#if !result.hidden}
    {#if result.success || (result.success === false && result.reason === 'wrong_answer')}
      {@const testIO = getIO(result)}
      <div class="flex flex-col gap-3">
        <h3>Input</h3>
        {#each testIO.inputs as input, i (i)}
          <div class="bg-base-100 flex flex-col gap-2 rounded-lg">
            <div class="font-mono text-xs text-base-content opacity-80">{input.symbol} =</div>
            <pre class="font-mono text-sm text-base-content">{input.value}</pre>
          </div>
        {/each}
      </div>
      <div class="flex flex-col gap-3">
        <h3>Output</h3>
        {#each testIO.outputs as input, i (i)}
          <div class="bg-base-100 flex flex-col gap-2 rounded-lg">
            <div class="font-mono text-xs text-base-content opacity-80">{input.symbol} =</div>
            <pre class="font-mono text-sm text-base-content">{input.actual}</pre>
            Expected:
            <pre class="font-mono text-sm text-base-content">{input.expected}</pre>
          </div>
        {/each}
      </div>
    {:else}
      Error: {result.reason
        .split('_')
        .map((x) => `${x.charAt(0).toUpperCase()}${x.substring(1)}`)
        .join(' ')}
      {#if result.reason === 'compile_error'}
        <pre class="font-mono bg-base-100 text-xs">{result.error}</pre>
      {/if}
    {/if}
  {/if}
</div>
