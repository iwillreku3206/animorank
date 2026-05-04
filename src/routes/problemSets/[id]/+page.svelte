<script lang="ts">
  import TagChip from '$lib/components/TagChip.svelte';
  import type { PageProps } from './$types';
  import ProblemListItem from './ProblemListItem.svelte';

  let { data }: PageProps = $props();

  const { problemSet, bookmarked, globalProblemSolves, globalProblemAttempts } = $derived(data);

  let tags = $derived([problemSet.difficulty, ...problemSet.topics].filter((x) => !!x));
  console.log(problemSet.problems);
  let progress = $derived(
    problemSet.problems.reduce(
      (prev, next) => [prev[0] + (next.status === 'done' ? 1 : 0), prev[1] + 1],
      [0, 0]
    )
  );
</script>

<main class="flex flex-col">
  <header class="flex flex-col gap-5 border-b border-neutral py-8 px-4 xl:px-32">
    <p>
      Courses / {#if problemSet.subject}
        <a
          class="text-primary"
          href="/problemSets?tag={problemSet.subject.id}"
        >
          {problemSet.subject?.label}
        </a>
      {:else}
        Other
      {/if}
    </p>

    <h1 class="text-4xl">{problemSet.title}</h1>
    <p class="text-primary">
      {#each problemSet.collaborators as collaborator, i (collaborator.id)}
        <a href="/problemSets?creator={collaborator.id}">{collaborator.name}</a>{i ===
        problemSet.collaborators.length - 1
          ? ''
          : ','}
      {/each}
    </p>

    <div class="flex flex-wrap flex-row gap-2">
      {#each tags as tag (tag.id)}<TagChip
          {tag}
          href="/problemSets?tag={tag.id}"
        />{/each}
    </div>

    <p class="text-base-content">{problemSet.description}</p>

    <div
      class="flex flex-row gap-8"
      style="--accent-color: hsl(
			{(progress[0] / progress[1]) * 120}deg,
			100%,
			50%
		)"
    >
      <div class="flex flex-col w-full gap-2">
        <div class="flex flex-row w-full">
          Progress
          <div class="ml-auto">
            {progress[0]}/{progress[1]} problem{progress[1] === 1 ? '' : 's'}
          </div>
        </div>
        <progress
          class="h-2 w-full bg-neutral-focus problemSetProgress rounded-sm"
          value={progress[0]}
          max={progress[1]}
        ></progress>
      </div>
    </div>
  </header>

  <div class="px-4 xl:px-32 gap-4 py-8">
    {#each problemSet.problems as problem (problem.id)}
      <ProblemListItem
        {problem}
        problemPassingRate={globalProblemSolves[problem.id]}
        problemAttempts={globalProblemAttempts[problem.id]}
      />
    {/each}
  </div>
</main>

<style>
  .problemSetProgress {
    accent-color: var(--accent-color);
  }

  .problemSetProgress::-moz-progress-bar {
    background-color: var(--accent-color);
  }

  .problemSetProgress::-webkit-progress-value {
    background-color: var(--accent-color);
  }
</style>
