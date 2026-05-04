<script lang="ts">
  import TagChip from '$lib/components/TagChip.svelte';
  import BookmarkIcon from '@iconify-svelte/fa6-regular/bookmark';
  import BookmarkIconSolid from '@iconify-svelte/fa6-solid/bookmark';
  import ArrowRightIcon from '@iconify-svelte/fa6-solid/arrow-right';
  import type { ProblemSet } from './api';

  export interface ProblemSetCardProps {
    problemSet: ProblemSet;
  }

  let { problemSet }: ProblemSetCardProps = $props();
</script>

<div class="relative w-full">
  <a
    href="/problemSets/{problemSet.id}"
    aria-label="Problem Set Link"
    class="absolute top-0 bottom-0 left-0 right-0 w-full h-full z-10"
  >
  </a>
  <div class="flex flex-col gap-4 bg-base-100 rounded-lg p-8">
    <div class="flex flex-row">
      <div class="flex flex-row flex-wrap gap-2">
        {#each problemSet.tags as tag (tag.id)}
          <TagChip
            {tag}
            href="/problemSets?tag={tag.id}"
            class="z-20"
          />
        {/each}
      </div>
      <button class="btn w-6 h-6 btn-ghost p-0 py-0 ml-auto z-20">
        {#if problemSet.bookmarked}
          <BookmarkIconSolid class="w-6 h-6" />
        {:else}
          <BookmarkIcon class="w-6 h-6" />
        {/if}
      </button>
    </div>
    <div class="flex flex-col gap-0.5">
      <h2 class="font-sans! text-xl font-bold">{problemSet.title}</h2>
      <div class="text-sm text-primary">{problemSet.ownerName}</div>
    </div>
    <p>{problemSet.description}</p>
    <div
      class="flex flex-row gap-8"
      style="--accent-color: hsl(
			{(problemSet.progress.finished / problemSet.progress.total) * 120},
			100%,
			50%
		)"
    >
      <div class="flex flex-col w-full gap-2">
        <div class="flex flex-row w-full">
          Progress
          <div class="ml-auto">
            {problemSet.progress.finished}/{problemSet.progress.total} problem{problemSet.progress
              .total == 1
              ? ''
              : 's'}
          </div>
        </div>
        <progress
          class="h-2 w-full bg-neutral-focus problemSetProgress rounded-sm"
          value={problemSet.progress.finished}
          max={problemSet.progress.total}
        ></progress>
      </div>
    </div>
  </div>
</div>

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
