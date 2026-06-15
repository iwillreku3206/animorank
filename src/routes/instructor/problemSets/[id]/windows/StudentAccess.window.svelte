<script lang="ts">
  import type { ProblemSetEditorWindowContext } from '../context.svelte';

  let { context }: { context: ProblemSetEditorWindowContext } = $props();
</script>

<section class="flex flex-col gap-4">
  <div class="form-control w-full">
    <label class="label">
      <span class="label-text">Student Access</span>
    </label>
    <input
      type="text"
      class="input input-bordered w-full"
      placeholder="Manage student access..."
    />
  </div>
</section>
