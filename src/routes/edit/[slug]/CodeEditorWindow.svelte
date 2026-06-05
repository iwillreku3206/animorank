<script lang="ts">
  import CodeEditor from '$lib/components/CodeEditor.svelte';

  let { context }: { context: ProblemEditorWindowContext } = $props();

  let code = $state('');
</script>

<CodeEditor
  bind:code
  language="C"
/>
