<script lang="ts">
  import Editor from '$lib/components/editor/Editor.svelte';
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import type { ProblemEditorWindowContext } from '../context.svelte';

  let { context }: { context: ProblemEditorWindowContext } = $props();
</script>

<section class="flex flex-col">
  <TextInput
    type="text"
    name="Problem Name"
    class="input-xs input-primary w-full"
    bind:value={context.problem.model.name}
  />

  <Editor bind:text={context.problem.model.description} />
</section>
