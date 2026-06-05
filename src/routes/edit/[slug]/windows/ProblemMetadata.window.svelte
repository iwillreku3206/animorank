<script lang="ts">
  import Editor from '$lib/components/Editor.svelte';
  import type { ProblemEditorWindowContext } from '../context.svelte';

  let { context }: { context: ProblemEditorWindowContext } = $props();
</script>

<section class="flex flex-col">
  <input
    type="text"
    name="Problem Name"
    class="input input-primary w-full"
    bind:value={context.problem.name}
  />

  <Editor bind:text={context.problem.description} />
</section>
