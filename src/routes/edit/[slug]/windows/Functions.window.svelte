<script lang="ts">
  import FunctionsEditor from '$lib/testCase/builtin/functionTestCase/FunctionsEditor.svelte';
  import { setProblemEditorContext } from '../context.svelte';
  import type { ProblemEditorWindowContext } from '../context.svelte';

  let { context }: { context: ProblemEditorWindowContext } = $props();
  // svelte-ignore state_referenced_locally
  setProblemEditorContext(context);
</script>

<FunctionsEditor />
