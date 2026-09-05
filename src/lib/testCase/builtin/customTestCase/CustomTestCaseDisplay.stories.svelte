<script
  module
  lang="ts"
>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CustomTestCaseDisplay from './CustomTestCaseDisplay.svelte';

  const { Story } = defineMeta({
    title: 'Test Case/Custom Test Case Display',
    component: CustomTestCaseDisplay
  });

  import type { CustomTestCaseRunInfo } from './customTestCase.svelte';
  import type { TestCaseResult } from '$lib/testCase/types';

  type Result = TestCaseResult<CustomTestCaseRunInfo>;
</script>

<script lang="ts">
  import type { ProblemTestCase } from '$lib/zenstack/models';

  const model = {
    id: 'tc-1',
    type: 'custom',
    problem_id: 'problem-1',
    public: true,
    data: { test_code: 'assert(square(5) == 25);' }
  } as unknown as ProblemTestCase;

  function result(
    runInfo: CustomTestCaseRunInfo,
    success: boolean,
    extra: { failureReason?: string; compilerOutput?: string } = {},
    testCode = 'assert(square(5) == 25);'
  ): Result {
    return {
      success,
      testCaseInfo: { ...model, public: true, data: { test_code: testCode } },
      ...extra,
      runInfo
    } as unknown as Result;
  }

  // Test code, exit code, and stderr are always shown now — including on a
  // pass — rather than collapsing to a bare status line.
  const passed = result({ exitCode: 0, stderr: '' }, true);

  const assertionFailed = result(
    { exitCode: 134, stderr: 'main.c:12: assertion "square(5) == 25" failed\nAborted' },
    false
  );

  const segfault = result({ exitCode: 139, stderr: 'Segmentation fault (core dumped)' }, false);

  // Non-zero exit with nothing on stderr: the field now renders its
  // "(no stderr)" placeholder rather than disappearing.
  const noStderr = result({ exitCode: 1, stderr: '' }, false);

  // No test code on record — exercises the "(no test code)" placeholder.
  const noTestCode = result({ exitCode: 0, stderr: '' }, true, {}, '');

  const longStderr = result(
    {
      exitCode: 1,
      stderr: Array.from({ length: 12 }, (_, i) => `test_${i + 1}: FAILED (expected ${i * i}, got 0)`).join('\n')
    },
    false
  );

  const compileError = result({ exitCode: 1, stderr: '' }, false, {
    compilerOutput: 'main.c:12:3: error: implicit declaration of function "square"'
  });

  const withFailureReason = result({ exitCode: 0, stderr: '' }, false, {
    failureReason: 'The test harness produced no output.'
  });

  const hidden = { success: false, testCaseInfo: { public: false } } as Result;
</script>

<!-- Matches the panel background the display sits on in the problem page. -->
{#snippet pane(testCaseResult: Result)}
  <div class="bg-base-300 text-base-content w-full rounded-lg p-4">
    <CustomTestCaseDisplay {testCaseResult} />
  </div>
{/snippet}

<Story name="Passed">
  {#snippet template()}{@render pane(passed)}{/snippet}
</Story>

<Story name="Assertion Failed">
  {#snippet template()}{@render pane(assertionFailed)}{/snippet}
</Story>

<Story name="Segmentation Fault">
  {#snippet template()}{@render pane(segfault)}{/snippet}
</Story>

<Story name="No Stderr">
  {#snippet template()}{@render pane(noStderr)}{/snippet}
</Story>

<Story name="No Test Code">
  {#snippet template()}{@render pane(noTestCode)}{/snippet}
</Story>

<Story name="Long Stderr">
  {#snippet template()}{@render pane(longStderr)}{/snippet}
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
