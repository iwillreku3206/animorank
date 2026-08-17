<script
  module
  lang="ts"
>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import FunctionTestCaseEditor from './FunctionTestCaseEditor.svelte';
  import { Problem } from '$lib/problem';
  import { FunctionTestCase } from './functionTestCase.svelte';
  import type { Problem as ProblemModel, ProblemTestCase } from '$lib/zenstack/models';

  const { Story } = defineMeta({
    title: 'Test Case/Function Test Case Editor',
    component: FunctionTestCaseEditor
  });
</script>

<script lang="ts">
  const problem = new Problem({
    id: 'problem-1',
    name: 'New types problem',
    description: '',
    starter_code: '',
    visible: false,
    uses_slots: false,
    language: 'c',
    difficulty_id: null,
    subject_id: null,
    extension_data: {
      builtin_testCase_function: {
        functions: {
          fn1: {
            name: 'work',
            parameters: [
              { name: 'p', type: { type: 'pointer', options: { target: 'int' } } },
              { name: 'f', type: { type: 'float', options: { size: 32 } } },
              { name: 's', type: { type: 'string', options: {} } }
            ],
            returnType: [{ type: 'void', options: {} }]
          }
        }
      }
    }
  } as unknown as ProblemModel);

  const testCase = new FunctionTestCase(
    {
      id: 'test-case-1',
      type: 'function',
      problem_id: 'problem-1',
      data: {
        function: 'fn1',
        parameters: [
          { name: 'p', value: { type: 'pointer', options: { target: 'int' }, data: { value: '5' } } },
          { name: 'f', value: { type: 'float', options: { size: 32 }, data: { value: '1.5' } } },
          { name: 's', value: { type: 'string', options: {}, data: { value: 'hi' } } }
        ],
        comparisons: []
      }
    } as unknown as ProblemTestCase,
    problem
  );
</script>

<Story
  name="Default"
  args={{ testCase }}
/>
