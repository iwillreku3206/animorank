<script
  module
  lang="ts"
>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import StdioTestCaseDisplay from './StdioTestCaseDisplay.svelte';

  const { Story } = defineMeta({
    title: 'Test Case/Stdio Test Case Display',
    component: StdioTestCaseDisplay
  });

  import type { StdioTestCaseRunInfo } from './stdioTestCase.svelte';
  import type { TestCaseResult } from '$lib/testCase/types';

  type Result = TestCaseResult<StdioTestCaseRunInfo>;
</script>

<script lang="ts">
  import type { ProblemTestCase } from '$lib/zenstack/models';

  // The display reads the stdin it shows straight off testCaseInfo.data.input,
  // so the model matters here as much as the runInfo.
  function model(input: string, output: string): ProblemTestCase {
    return {
      id: 'tc-1',
      type: 'stdio',
      problem_id: 'problem-1',
      public: true,
      data: { input, output }
    } as unknown as ProblemTestCase;
  }

  function result(
    input: string,
    expected: string,
    actual: string,
    success: boolean,
    extra: { failureReason?: string; compilerOutput?: string } = {}
  ): Result {
    return {
      success,
      testCaseInfo: { ...model(input, expected), public: true },
      ...extra,
      runInfo: { expected, actual }
    } as unknown as Result;
  }

  const passed = result('3 4\n', '7\n', '7\n', true);

  const wrongOutput = result('10 20\n', '30\n', '1030\n', false);

  // Long multi-line output — the case where the <pre> blocks have to hold up.
  const multiline = result('5\n', '1\n1 1\n1 2 1\n1 3 3 1\n1 4 6 4 1\n', '1\n1 1\n1 2 1\n1 3 3 1\n1 4 6 4 0\n', false);

  // Trailing-whitespace mismatch: the two blocks look identical on screen,
  // which is exactly the case worth designing for.
  const whitespaceOnly = result('1 2\n', '3\n', '3 \n', false);

  const noOutput = result('7\n', '49\n', '', false);

  const compileError = result('1 2\n', '3\n', '', false, {
    compilerOutput: 'main.c:5:1: error: expected declaration or statement at end of input'
  });

  const withFailureReason = result('1 2\n', '3\n', '', false, {
    failureReason: 'The program timed out after 5 seconds.'
  });

  const hidden = { success: false, testCaseInfo: { public: false } } as Result;
</script>

<!-- The display draws base-100 cards with base-200 <pre> blocks inside, so it
     needs the base-300 panel behind it to read correctly. -->
{#snippet pane(testCaseResult: Result)}
  <div class="bg-base-300 text-base-content w-full rounded-lg p-4">
    <StdioTestCaseDisplay {testCaseResult} />
  </div>
{/snippet}

<Story name="Passed">
  {#snippet template()}{@render pane(passed)}{/snippet}
</Story>

<Story name="Wrong Output">
  {#snippet template()}{@render pane(wrongOutput)}{/snippet}
</Story>

<Story name="Multiline Output">
  {#snippet template()}{@render pane(multiline)}{/snippet}
</Story>

<Story name="Whitespace-Only Difference">
  {#snippet template()}{@render pane(whitespaceOnly)}{/snippet}
</Story>

<Story name="No Output">
  {#snippet template()}{@render pane(noOutput)}{/snippet}
</Story>

<Story name="Compile Error">
  {#snippet template()}{@render pane(compileError)}{/snippet}
</Story>

<Story name="With Failure Reason">
  {#snippet template()}{@render pane(withFailureReason)}{/snippet}
</Story>

<Story name="Hidden Test Case">
  {#snippet template()}{@render pane(hidden)}{/snippet}
</Story>
