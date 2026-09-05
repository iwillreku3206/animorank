<script
  module
  lang="ts"
>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import FunctionsEditor from './FunctionsEditor.svelte';
  import { ProblemEditorWindowContext, setProblemEditorContext } from '../../../../routes/edit/[slug]/context.svelte';
  import type { Problem as ProblemModel } from '$lib/zenstack/models';

  const { Story } = defineMeta({
    title: 'Test Case/Function Editor',
    component: FunctionsEditor
  });
</script>

<script lang="ts">
  const problemModel = {
    id: 'problem-1',
    name: 'Test problem',
    description: '',

    visible: false,
    uses_slots: false,
    language: 'c',
    difficulty_id: null,
    subject_id: null,
    extension_data: {
      builtin_testCase_function: {
        functions: {}
      }
    }
  } as unknown as ProblemModel;

  const context = new ProblemEditorWindowContext({
    problem: problemModel,
    testCases: [],
    tags: [],
    topics: []
  });
  setProblemEditorContext(context);
</script>

<Story name="Default" />
