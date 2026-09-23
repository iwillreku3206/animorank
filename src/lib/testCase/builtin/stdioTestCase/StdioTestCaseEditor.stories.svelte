<script
  module
  lang="ts"
>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import StdioTestCaseEditor from './StdioTestCaseEditor.svelte';

  const { Story } = defineMeta({
    title: 'Test Case/Stdio Test Case Editor',
    component: StdioTestCaseEditor
  });
</script>

<script lang="ts">
  import { Problem } from '$lib/problem';
  import { StdioTestCase, type WhitespaceMode } from './stdioTestCase.svelte';
  import type { Problem as ProblemModel, ProblemTestCase } from '$lib/zenstack/models';

  const problem = new Problem({
    id: 'problem-1',
    name: 'Sum two numbers',
    description: '',
    starter_code: '',
    visible: false,
    uses_slots: false,
    language: 'c',
    difficulty_id: null,
    subject_id: null,
    extension_data: {}
  } as unknown as ProblemModel);

  // Each story needs its own instance: the radios write straight into
  // `data`, so a shared one would leak a selection between stories.
  function testCase(id: string, input: string, output: string, whitespace: WhitespaceMode): StdioTestCase {
    return new StdioTestCase(
      {
        id,
        type: 'stdio',
        problem_id: 'problem-1',
        public: true,
        data: { input, output, whitespace }
      } as unknown as ProblemTestCase,
      problem
    );
  }

  const strict = testCase('tc-strict', '3 4\n', '7\n', 'strict');
  const trimOutput = testCase('tc-trim-output', '3 4\n', '7', 'trim_output');
  const trimLines = testCase('tc-trim-lines', '5\n', '1\n1 1\n1 2 1\n', 'trim_lines');

  // A row written before the mode existed: hydration supplies the default, so
  // the group is never left with nothing selected.
  const legacy = new StdioTestCase(
    {
      id: 'tc-legacy',
      type: 'stdio',
      problem_id: 'problem-1',
      public: true,
      data: { input: '3 4\n', output: '7\n' }
    } as unknown as ProblemTestCase,
    problem
  );
</script>

{#snippet pane(testCase: StdioTestCase)}
  <div class="bg-base-200 text-base-content w-full max-w-xl rounded-lg p-4">
    <StdioTestCaseEditor {testCase} />
  </div>
{/snippet}

<Story name="Match Exactly">
  {#snippet template()}{@render pane(strict)}{/snippet}
</Story>

<Story name="Ignore End Of Output">
  {#snippet template()}{@render pane(trimOutput)}{/snippet}
</Story>

<Story name="Ignore End Of Every Line">
  {#snippet template()}{@render pane(trimLines)}{/snippet}
</Story>

<Story name="Legacy Test Case Without A Mode">
  {#snippet template()}{@render pane(legacy)}{/snippet}
</Story>
