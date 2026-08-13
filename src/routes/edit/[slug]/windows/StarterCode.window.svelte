<script lang="ts">
  import CodeEditor from '$lib/components/editor/CodeEditor.svelte';
  import type { ProblemEditorWindowContext } from '../context.svelte';

  let { context = $bindable() }: { context: ProblemEditorWindowContext } = $props();
</script>

<CodeEditor
  bind:code={context.problem.model.starter_code}
  language={context.problem.model.language.toLowerCase()}
/>
