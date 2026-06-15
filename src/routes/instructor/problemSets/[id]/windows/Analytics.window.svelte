<script lang="ts">
  import type { ProblemSetEditorWindowContext } from '../context.svelte';

  let { context }: { context: ProblemSetEditorWindowContext } = $props();
</script>

<section class="flex flex-col gap-4">
  <div class="form-control w-full">
    <label class="label">
      <span class="label-text">Analytics</span>
    </label>
    <p class="text-base-content/50">Analytics content goes here...</p>
  </div>
</section>
