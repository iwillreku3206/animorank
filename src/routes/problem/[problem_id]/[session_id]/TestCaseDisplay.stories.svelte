<script
  module
  lang="ts"
>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import TestCaseDisplay from '$lib/components/solve/TestCaseDisplay.svelte';

  const { Story } = defineMeta({
    title: 'Student/Test Case Display',
    component: TestCaseDisplay
  });
</script>

<script lang="ts">
  import { Problem } from '$lib/problem';
  import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
  import type { Problem as ProblemModel, ProblemTestCase } from '$lib/zenstack/models';
  import type { TestRunResponse } from '$lib/practiceSession/api';
  import { GlobalRegistryProvider } from '$lib/registry/global';

  type Result = TestRunResponse['results'][number];

  const int32 = { type: 'int', options: { size: 32, signed: null } };
  const intValue = (v: string) => ({ ...int32, data: { value: v } });

  // Mirrors what a real problem carries: one int(int) function under test.
  const problem = new Problem({
    id: 'problem-1',
    name: 'Square',
    description: '',
    starter_code: '',
    visible: true,
    uses_slots: false,
    language: 'c',
    difficulty_id: null,
    subject_id: null,
    extension_data: {
      builtin_testCase_function: {
        functions: {
          fn1: {
            name: 'square',
            parameters: [{ name: 'n', type: int32 }],
            returnType: [int32]
          }
        }
      }
    }
  } as unknown as ProblemModel);

  const registry = GlobalRegistryProvider.instance().getRegistry(TestCaseRegistry);

  function functionModel(id: string, arg: string): ProblemTestCase {
    return {
      id,
      type: 'function',
      problem_id: 'problem-1',
      public: true,
      data: {
        function: 'fn1',
        parameters: [{ name: 'n', value: intValue(arg) }],
        comparisons: []
      }
    } as unknown as ProblemTestCase;
  }

  function stdioModel(id: string, input: string, output: string): ProblemTestCase {
    return {
      id,
      type: 'stdio',
      problem_id: 'problem-1',
      public: true,
      data: { input, output }
    } as unknown as ProblemTestCase;
  }

  /** Same shape the API layer produces: hydrated testCase + hydrated runInfo. */
  async function result(
    model: ProblemTestCase,
    runInfo: unknown,
    success: boolean,
    extra: { failureReason?: string; compilerOutput?: string } = {}
  ): Promise<Result> {
    const testCase = await registry.from(model, problem);
    return {
      success,
      testCaseInfo: { ...model, public: true },
      ...extra,
      runInfo: await testCase.hydrateRunInfo(runInfo as never),
      testCase
    } as unknown as Result;
  }

  /** A public result the API layer failed to hydrate (registry threw). */
  function unhydrated(model: ProblemTestCase): Result {
    return {
      success: false,
      testCaseInfo: { ...model, public: true },
      failureReason: 'Unknown test case type',
      runInfo: {}
    } as unknown as Result;
  }

  const hidden = (success: boolean): Result => ({ success, testCaseInfo: { public: false } }) as Result;

  const comparison = (expected: string, actual: string, ok: boolean) => ({
    comparisons: [{ symbol: 'return', expected: intValue(expected), actual: intValue(actual), result: ok }]
  });

  /**
   * Fixtures resolve as promises and are awaited in the story templates: the
   * app compiles with `experimental.async`, but Storybook's svelte-csf indexer
   * compiles story files with default compiler options, where a top-level
   * `await` fails indexing.
   */
  const fixture = (results: (Result | Promise<Result>)[], success = false): Promise<TestRunResponse> =>
    Promise.all(results).then((hydrated) => ({ success, results: hydrated }));

  // --- fixtures per story ---
  const mixed = fixture([
    result(functionModel('tc-1', '5'), comparison('25', '25', true), true),
    result(functionModel('tc-2', '7'), comparison('49', '14', false), false),
    result(functionModel('tc-3', '9'), { failure: 'timeout' }, false)
  ]);

  const stdio = fixture([
    result(stdioModel('tc-1', '3 4\n', '7\n'), { expected: '7\n', actual: '7\n' }, true),
    result(stdioModel('tc-2', '10 20\n', '30\n'), { expected: '30\n', actual: '1030\n' }, false)
  ]);

  const failures = fixture([
    result(functionModel('tc-1', '1'), { failure: 'compile_error' }, false, {
      compilerOutput: 'main.c:3:5: error: expected ";" before "}" token'
    }),
    result(functionModel('tc-2', '2'), { failure: 'run_error', exitCode: 139, stderr: 'Segmentation fault' }, false),
    result(functionModel('tc-3', '3'), { failure: 'output_not_generated' }, false),
    result(functionModel('tc-4', '4'), { failure: 'timeout' }, false)
  ]);

  const empty = fixture([], true);

  const broken = fixture([unhydrated(functionModel('tc-1', '5'))]);

  const submitMixed = fixture([
    result(functionModel('tc-1', '5'), comparison('25', '25', true), true),
    result(functionModel('tc-2', '7'), comparison('49', '14', false), false),
    result(functionModel('tc-3', '8'), { failure: 'compile_error' }, false),
    result(functionModel('tc-4', '9'), { failure: 'timeout' }, false),
    result(functionModel('tc-5', '10'), { failure: 'run_error', exitCode: 139 }, false),
    result(functionModel('tc-6', '11'), { failure: 'output_not_generated' }, false),
    hidden(true),
    hidden(false)
  ]);

  let selMixed = $state(0);
  let selStdio = $state(0);
  let selFailures = $state(0);
  let selEmpty = $state(-1);
  let selBroken = $state(0);
  let selSubmit = $state(0);
</script>

<Story name="Run - Mixed Results">
  {#snippet template()}
    {#await mixed then tests}
      <div class="bg-base-300 text-base-content h-96 w-full rounded-lg">
        <TestCaseDisplay
          {tests}
          lastTestType="run"
          bind:selectedTest={selMixed}
        />
      </div>
    {/await}
  {/snippet}
</Story>

<Story name="Run - Stdio Test Case">
  {#snippet template()}
    {#await stdio then tests}
      <div class="bg-base-300 text-base-content h-96 w-full rounded-lg">
        <TestCaseDisplay
          {tests}
          lastTestType="run"
          bind:selectedTest={selStdio}
        />
      </div>
    {/await}
  {/snippet}
</Story>

<Story name="Run - Failure Modes">
  {#snippet template()}
    {#await failures then tests}
      <div class="bg-base-300 text-base-content h-96 w-full rounded-lg">
        <TestCaseDisplay
          {tests}
          lastTestType="run"
          bind:selectedTest={selFailures}
        />
      </div>
    {/await}
  {/snippet}
</Story>

<Story name="Run - No Results">
  {#snippet template()}
    {#await empty then tests}
      <div class="bg-base-300 text-base-content h-96 w-full rounded-lg">
        <TestCaseDisplay
          {tests}
          lastTestType="run"
          bind:selectedTest={selEmpty}
        />
      </div>
    {/await}
  {/snippet}
</Story>

<Story name="Run - Unhydratable Result">
  {#snippet template()}
    {#await broken then tests}
      <div class="bg-base-300 text-base-content h-96 w-full rounded-lg">
        <TestCaseDisplay
          {tests}
          lastTestType="run"
          bind:selectedTest={selBroken}
        />
      </div>
    {/await}
  {/snippet}
</Story>

<Story name="Submit - Result Chips">
  {#snippet template()}
    {#await submitMixed then tests}
      <div class="bg-base-300 text-base-content h-96 w-full rounded-lg">
        <TestCaseDisplay
          {tests}
          lastTestType="submit"
          bind:selectedTest={selSubmit}
        />
      </div>
    {/await}
  {/snippet}
</Story>

<Story name="Submit - All Passed">
  {#snippet template()}
    {#await empty then tests}
      <div class="bg-base-300 text-base-content h-96 w-full rounded-lg">
        <TestCaseDisplay
          {tests}
          lastTestType="submit"
          testSubmitted
          handleReturn={() => alert('Return to problem set')}
          bind:selectedTest={selEmpty}
        />
      </div>
    {/await}
  {/snippet}
</Story>
