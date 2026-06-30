<script lang="ts">
  import TagChip from '$lib/components/ui/TagChip.svelte';
  import type { PageProps } from './$types';
  import type { Tag } from '$lib/zenstack/models';

  let {
    problem,
    problemSolvers,
    problemAttempts,
    tagMap
  }: {
    problem: PageProps['data']['problemSet']['problems'][number];
    problemSolvers?: PageProps['data']['globalProblemSolvers'][string];
    problemAttempts?: PageProps['data']['globalProblemAttempts'][string];
    tagMap: Record<string, Tag>;
  } = $props();

  let tagIds = $derived([problem.difficulty_id, ...problem.topics].filter((x) => !!x));
  let tags = $derived(tagIds.map((id) => tagMap[id!]));

  let totalAttempts = $derived(
    parseInt((problemAttempts || [])[0]?.attempts.toString() || '0') || 0
  );

  let totalSolvers = $derived(parseInt((problemSolvers || [])[0]?.solvers.toString() || '0') || 0);

  let passRate = $derived(totalSolvers / (totalAttempts || 1));
</script>

<a
  href="/problem/{problem.id}"
  aria-label={`View details for ${problem.name}`}
>
  <div
    class="w-full flex flex-row gap-8 bg-base-200 px-8 py-4 rounded-lg hover:bg-base-100/70"
    aria-label={`View details for ${problem.name}`}
  >
    <!-- Problem details -->
    <div class="flex-[9] flex-1 flex flex-col gap-2">
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
          Passing Rate: <span class="font-bold text-base-content"
            >{(passRate * 100).toFixed(2)}%</span
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
    <div class="flex-[1] flex flex-row gap-4 items-center">
      <div>edit</div>
      <div>delete</div>
    </div>
  </div>
</a>
