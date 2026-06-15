<script lang="ts">
  import type { ProblemSetEditorWindowContext } from '../context.svelte';

  let { context }: { context: ProblemSetEditorWindowContext } = $props();
</script>

<section class="flex flex-col gap-4">
  <div class="form-control w-full">
    <label class="label">
      <span class="label-text">Problem Set Title</span>
    </label>
    <div class="flex gap-2">
      <input
        type="text"
        class="input input-bordered w-full"
        placeholder="e.g., CCPROG1 Week 3 - Arrays and Loops"
        bind:value={context.problemSet.title}
      />
      <button class="btn btn-success">Rename</button>
    </div>
  </div>

  <div class="form-control w-full">
    <label class="label">
      <span class="label-text">Course Assignment</span>
    </label>
    <select class="select select-bordered w-full">
      <option
        disabled
        selected>Select Course</option
      >
    </select>
  </div>

  <div class="form-control w-full">
    <label class="label">
      <span class="label-text">Description</span>
    </label>
    <textarea
      class="textarea textarea-bordered h-32"
      placeholder="Brief overview of topics covered..."
      bind:value={context.problemSet.description}
    ></textarea>
  </div>
</section>
