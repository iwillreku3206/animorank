<script lang="ts">
  import CodeEditor from '$lib/components/CodeEditor.svelte';
  import type { ProblemEditorWindowContext } from '../context.svelte';

  let { context = $bindable() }: { context: ProblemEditorWindowContext } = $props();
</script>

<CodeEditor
  bind:code={context.problem.starter_code}
  language={context.problem.language.toLowerCase()}
/>
