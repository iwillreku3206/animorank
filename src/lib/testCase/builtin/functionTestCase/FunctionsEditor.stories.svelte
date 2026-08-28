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

  // The context is normally built by the async `ProblemEditorWindowContext.create()`;
  // this story needs it synchronously because FunctionsEditor reads it at setup.
  // Constructing via the runtime path (TS `private` is erased) with the empty
  // functionData/testCases mirrors what create() would resolve for this story.
  const context = new (ProblemEditorWindowContext as unknown as new (
    initialValues: { problem: ProblemModel; testCases: never[]; tags: never[]; topics: never[] },
    functionData: { functions: Record<string, never> },
    testCases: never[]
  ) => ProblemEditorWindowContext)(
    { problem: problemModel, testCases: [], tags: [], topics: [] },
    { functions: {} },
    []
  );
  setProblemEditorContext(context);
</script>

<Story name="Default" />
