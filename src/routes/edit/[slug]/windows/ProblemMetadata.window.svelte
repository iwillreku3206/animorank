<script lang="ts">
  import Editor from '$lib/components/editor/Editor.svelte';
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import type { ProblemEditorWindowContext } from '../context.svelte';

  let { context }: { context: ProblemEditorWindowContext } = $props();
</script>

<!-- `h-full` bounds the window to its dockview panel: a content-height section
     would grow past the panel and be clipped by the group, putting the bottom
     of a long description out of reach with nothing to scroll. -->
<section class="flex h-full flex-col">
  <TextInput
    type="text"
    name="Problem Name"
    class="input-xs input-primary w-full shrink-0"
    bind:value={context.problem.model.name}
  />

  <!-- `min-h-0` lets this shrink below the editor's content height, which is
       what gives the editor a definite height to scroll within. -->
  <div class="min-h-0 flex-1">
    <Editor
      class="h-full"
      bind:text={context.problem.model.description}
    />
  </div>
</section>
