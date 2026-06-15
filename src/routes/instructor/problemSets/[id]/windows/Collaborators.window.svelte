<script lang="ts">
  import type { ProblemSetEditorWindowContext } from '../context.svelte';

  let { context }: { context: ProblemSetEditorWindowContext } = $props();
</script>

<section class="flex flex-col gap-4">
  <div class="form-control w-full">
    <label class="label">
      <span class="label-text">Collaborators</span>
    </label>
    <input
      type="text"
      class="input input-bordered w-full"
      placeholder="Add collaborators..."
    />
  </div>
</section>
