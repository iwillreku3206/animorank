<script
  module
  lang="ts"
>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import FunctionTestCaseDisplay from './FunctionTestCaseDisplay.svelte';
  import { FunctionTestCase, type FunctionTestCaseRunInfo } from './functionTestCase.svelte';
  import type { TestCaseResult } from '$lib/testCase/types';

  const { Story } = defineMeta({
    title: 'Test Case/Function Test Case Display',
    component: FunctionTestCaseDisplay
  });

  // Mirrors what api.ts hands the display: the result plus its hydrated
  // TestCase, which is where the operators and parameter names come from.
  type Result = TestCaseResult<FunctionTestCaseRunInfo> & { testCase?: FunctionTestCase };
</script>

<script lang="ts">
  import { Problem } from '$lib/problem';
  import type { Problem as ProblemModel, ProblemTestCase } from '$lib/zenstack/models';

  const int32 = { type: 'int', options: { size: 32, signed: null } };
  /** A serialized TypeValue, in the shape the run endpoint puts on the wire. */
  const intValue = (v: string) => ({ ...int32, data: { value: v } });

  // Two functions: a one-parameter one for most stories, and a two-parameter
  // one so `param1` labels have a second position to resolve against.
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
          },
          fn2: {
            name: 'clamp',
            parameters: [
              { name: 'value', type: int32 },
              { name: 'limit', type: int32 }
            ],
            returnType: [int32]
          }
        }
      }
    }
  } as unknown as ProblemModel);

  type SerializedOperator = { type: string; options: unknown };
  const op = (type: string, options: unknown = null): SerializedOperator => ({ type, options });

  /** A definition comparison — this is where the operator lives. */
  const def = (symbol: string, operator: SerializedOperator, value: string) => ({
    symbol,
    operator,
    value: intValue(value)
  });

  /** A runInfo comparison — the wire result, with no operator on it. */
  const cmp = (symbol: string, expected: string, actual: string, ok: boolean) => ({
    symbol,
    expected: intValue(expected),
    actual: intValue(actual),
    result: ok
  });

  /**
   * A fresh model object each call: TestCase's data setter writes hydrated
   * values back onto model.data, so one model cannot be parsed twice.
   */
  function model(
    fn: 'fn1' | 'fn2',
    args: { name: string; value: string }[],
    comparisons: ReturnType<typeof def>[]
  ): ProblemTestCase {
    return {
      id: 'tc-1',
      type: 'function',
      problem_id: 'problem-1',
      public: true,
      data: {
        function: fn,
        parameters: args.map((a) => ({ name: a.name, value: intValue(a.value) })),
        comparisons
      }
    } as unknown as ProblemTestCase;
  }

  /**
   * Builds a result the way the API layer does — raw wire runInfo in, hydrated
   * TypeValues out, TestCase attached — so the stories hand the display the
   * same objects it gets in production.
   */
  function result(
    testCaseModel: ProblemTestCase,
    runInfo: unknown,
    success: boolean,
    extra: { failureReason?: string; compilerOutput?: string } = {}
  ): Result {
    const testCase = new FunctionTestCase(testCaseModel, problem);
    return {
      success,
      testCaseInfo: { ...testCaseModel, public: true },
      ...extra,
      runInfo: testCase.hydrateRunInfo(runInfo as FunctionTestCaseRunInfo),
      testCase
    } as unknown as Result;
  }

  const equal = op('equal');
  const square = (n: string) => [{ name: 'n', value: n }];

  const passed = result(
    model('fn1', square('5'), [def('return', equal, '25')]),
    { comparisons: [cmp('return', '25', '25', true)] },
    true
  );

  const wrongAnswer = result(
    model('fn1', square('7'), [def('return', equal, '49')]),
    { comparisons: [cmp('return', '49', '14', false)] },
    false
  );

  // The case the operator work exists for: "Expected 49" would read as a
  // broken equality test when the assertion is actually "> 49".
  const greaterThan = result(
    model('fn1', square('7'), [def('return', op('greater_than'), '49')]),
    { comparisons: [cmp('return', '49', '14', false)] },
    false
  );

  const withinRange = result(
    model('fn1', square('5'), [def('return', op('within_range', { range: '2' }), '25')]),
    { comparisons: [cmp('return', '25', '26', true)] },
    true
  );

  // Every branch of label(): a named parameter, a bare return, and a
  // numbered return — with passing and failing rows side by side.
  const multipleComparisons = result(
    model('fn1', square('3'), [
      def('param0', equal, '3'),
      def('return', equal, '9'),
      def('return1', op('less_than'), '12')
    ]),
    {
      comparisons: [cmp('param0', '3', '3', true), cmp('return', '9', '9', true), cmp('return1', '12', '7', false)]
    },
    false
  );

  const multiArgument = result(
    model(
      'fn2',
      [
        { name: 'value', value: '15' },
        { name: 'limit', value: '10' }
      ],
      [def('param1', op('less_than_equal'), '10')]
    ),
    { comparisons: [cmp('param1', '10', '15', false)] },
    false
  );

  // Both name sources blank — the case that produced an empty row label
  // before the positional fallback. param1 is the *second* parameter.
  const unnamedParameters = result(
    model(
      'fn2',
      [
        { name: '', value: '15' },
        { name: '', value: '10' }
      ],
      [def('param1', op('equal'), '10')]
    ),
    { comparisons: [cmp('param1', '10', '15', false)] },
    false
  );

  const noComparisons = result(model('fn1', square('5'), []), { comparisons: [] }, true);

  const failing = (runInfo: unknown, extra = {}) =>
    result(model('fn1', square('5'), [def('return', equal, '25')]), runInfo, false, extra);

  const compileError = failing(
    { failure: 'compile_error' },
    {
      compilerOutput:
        'main.c: In function "square":\nmain.c:3:5: error: expected ";" before "}" token\n    3 |     return n * n\n      |     ^'
    }
  );
  const runtimeError = failing({ failure: 'run_error', exitCode: 139, stderr: 'Segmentation fault (core dumped)' });
  const timedOut = failing({ failure: 'timeout' });
  const outputNotGenerated = failing({ failure: 'output_not_generated' });
  const withFailureReason = failing(
    { failure: 'run_error', exitCode: 1 },
    { failureReason: 'Execution was terminated by the grader.' }
  );

  const hidden = { success: false, testCaseInfo: { public: false } } as Result;
</script>

<!-- Mirrors the panel the display renders in: base-300 behind its base-100 boxes. -->
{#snippet pane(testCaseResult: Result)}
  <div class="w-full rounded-lg bg-base-300 p-4 text-base-content">
    <FunctionTestCaseDisplay {testCaseResult} />
  </div>
{/snippet}

<Story name="Passed">
  {#snippet template()}{@render pane(passed)}{/snippet}
</Story>

<Story name="Wrong Answer">
  {#snippet template()}{@render pane(wrongAnswer)}{/snippet}
</Story>

<Story name="Non-Equality Operator">
  {#snippet template()}{@render pane(greaterThan)}{/snippet}
</Story>

<Story name="Within Range">
  {#snippet template()}{@render pane(withinRange)}{/snippet}
</Story>

<Story name="Multiple Comparisons">
  {#snippet template()}{@render pane(multipleComparisons)}{/snippet}
</Story>

<Story name="Named Parameter Comparison">
  {#snippet template()}{@render pane(multiArgument)}{/snippet}
</Story>

<Story name="Unnamed Parameters">
  {#snippet template()}{@render pane(unnamedParameters)}{/snippet}
</Story>

<Story name="No Comparisons">
  {#snippet template()}{@render pane(noComparisons)}{/snippet}
</Story>

<Story name="Compile Error">
  {#snippet template()}{@render pane(compileError)}{/snippet}
</Story>

<Story name="Runtime Error">
  {#snippet template()}{@render pane(runtimeError)}{/snippet}
</Story>

<Story name="Timed Out">
  {#snippet template()}{@render pane(timedOut)}{/snippet}
</Story>

<Story name="Output Not Generated">
  {#snippet template()}{@render pane(outputNotGenerated)}{/snippet}
</Story>

<Story name="With Failure Reason">
  {#snippet template()}{@render pane(withFailureReason)}{/snippet}
</Story>

<Story name="Hidden Test Case">
  {#snippet template()}{@render pane(hidden)}{/snippet}
</Story>
