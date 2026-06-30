<script lang="ts">
  import TagChip from '$lib/components/ui/TagChip.svelte';
  import type { PageProps } from './$types';
  import type { Tag } from '$lib/zenstack/models';
  import TrashIcon from '@iconify-svelte/fa6-solid/trash-can';
  import { goto } from '$app/navigation';

  let {
    problem,
    problemSolvers,
    problemAttempts,
    tagMap,
    onDelete
  }: {
    problem: PageProps['data']['problemSet']['problems'][number];
    problemSolvers?: PageProps['data']['globalProblemSolvers'][string];
    problemAttempts?: PageProps['data']['globalProblemAttempts'][string];
    tagMap: Record<string, Tag>;
    onDelete: () => void;
  } = $props();

  let tagIds = $derived([problem.difficulty_id, ...problem.topics].filter((x) => !!x));
  let tags = $derived(tagIds.map((id) => tagMap[id!]));

  let totalAttempts = $derived(
    parseInt((problemAttempts || [])[0]?.attempts.toString() || '0') || 0
  );

  let totalSolvers = $derived(parseInt((problemSolvers || [])[0]?.solvers.toString() || '0') || 0);

  let passRate = $derived(totalSolvers / (totalAttempts || 1));
</script>

<div
  class="w-full flex flex-row gap-8 bg-base-200 px-8 py-4 rounded-lg hover:bg-base-100/70 cursor-pointer relative"
  role="link"
  tabindex="0"
  aria-label={`View details for ${problem.name}`}
  onclick={() => goto(`/edit/${problem.id}`)}
  onkeydown={(e) => {
    if (e.key === 'Enter') goto(`/edit/${problem.id}`);
  }}
>
  <!-- Problem details -->
  <div class="flex-9 flex flex-col gap-2">
    <!-- Tags -->
    <div class="flex flex-row flex-wrap gap-2">
      {#each tags as tag (tag.id)}
        <TagChip {tag} />
      {/each}
    </div>

    <!-- Title + status -->
    <h2
      class="text-xl font-display font-semibold line-clamp-2 overflow-hidden flex flex-row items-center gap-4"
    >
      {problem.name}
    </h2>

    <!-- Stats -->
    <div class="flex flex-col gap-2 text-base-content/70 text-sm sm:flex-row sm:items-center">
      <!-- Passing rate -->
      <div class="w-full sm:w-48">
        Passing Rate: <span class="font-bold text-base-content">{(passRate * 100).toFixed(2)}%</span
        >
      </div>

      <!-- Total attempts -->
      <div class="w-full sm:w-auto">
        Total attempts:
        <span class="font-bold text-base-content">
          {totalAttempts} student{totalAttempts === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  </div>

  <!-- Action buttons -->
  <div class="flex-1 flex flex-row gap-4 items-center">
    <button
      class="btn btn-ghost btn-square relative z-10"
      onclick={(e) => {
        e.stopPropagation();
        if (window.confirm(`Delete "${problem.name}"? This action cannot be undone.`)) {
          onDelete();
        }
      }}
      aria-label={`Delete ${problem.name}`}
    >
      <TrashIcon class="w-5 h-5 text-error" />
    </button>
  </div>
</div>
