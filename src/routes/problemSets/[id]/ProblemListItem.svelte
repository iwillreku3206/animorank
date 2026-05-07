<script lang="ts">
  import TagChip from '$lib/components/TagChip.svelte';
  import type { PageProps } from './$types';

  let {
    problem,
    problemPassingRate,
    problemAttempts
  }: {
    problem: PageProps['data']['problemSet']['problems'][number];
    problemPassingRate?: PageProps['data']['globalProblemSolves'][string];
    problemAttempts?: PageProps['data']['globalProblemAttempts'][string];
  } = $props();

  let tags = $derived([problem.difficulty, ...problem.topics].filter((x) => !!x));

  let totalAttempts = $derived(
    problemPassingRate?.reduce((prev, next) => prev + next._count._all, 0) || 0
  );

  let passRate = $derived(
    (problemPassingRate?.find((x) => x.done)?._count._all || 0) / totalAttempts === 0
      ? 1
      : totalAttempts
  );

  let solveUsers = $derived(
    problemAttempts?.reduce((prev, next) => prev + Number(next?.attempts || 0), 0) || 0
  );
</script>

<div class="w-full flex flex-row bg-base-100 px-8 py-4 rounded-lg items-center">
  <div class="flex flex-col gap-3">
    <div class="flex flex-row flex-wrap gap-2">
      {#each tags as tag (tag.id)}
        <TagChip
          {tag}
          href="/problemSets?tag={tag.id}"
        />
      {/each}
    </div>
    <h2 class="text-xl">{problem.title}</h2>
    <div class="flex flex-row">
      <div class="w-48">
        Passing Rate: <span class="font-bold">{(passRate * 100).toFixed(2)}%</span>
      </div>
      <div>
        Submission attempts:
        <span class="font-bold">
          {totalAttempts} attempt{totalAttempts === 1 ? '' : 's'} ({solveUsers} user{solveUsers ===
          1
            ? ''
            : 's'})
        </span>
      </div>
    </div>
  </div>
  <div class="ml-auto">
    <a
      class="btn bg-primary text-primary-content px-4 py-3"
      href="/problem/{problem.id}"
    >
      Start
    </a>
  </div>
</div>
