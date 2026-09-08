<script lang="ts">
  import TagChip from '$lib/components/ui/TagChip.svelte';
  import ArrowRightIcon from '@iconify-svelte/fa6-solid/arrow-right';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
  import ProblemSetActions from './ProblemSetActions.svelte';
  import type { PageProps } from './$types';

  type ProblemSet = PageProps['data']['problemSets'][number];

  let { problemSet, onDelete }: { problemSet: ProblemSet; onDelete: () => void } = $props();
</script>

<div class="relative flex w-full flex-row items-center gap-8 rounded-lg bg-base-200 px-8 py-4 hover:bg-base-100/70">
  <div class="flex min-w-0 flex-1 flex-col gap-2">
    <p class="text-xs tracking-wide text-base-content/70">
      Courses / {#if problemSet.subject}
        <a
          class="transition-colors duration-250 hover:text-primary"
          href="/instructor/problemSets?tag={problemSet.subject.id}"
        >
          {problemSet.subject.label}
        </a>
      {:else}
        Other
      {/if}
    </p>

    <h2 class="line-clamp-2 overflow-hidden font-display text-xl font-semibold">
      <a
        class="transition-colors duration-250 hover:text-primary"
        href="/instructor/problemSets/{problemSet.id}"
      >
        {problemSet.title}
      </a>
    </h2>

    <div class="flex max-h-7 flex-row flex-wrap items-center gap-2 overflow-hidden">
      <span class="text-sm text-base-content/70">
        {problemSet.problemCount} problem{problemSet.problemCount === 1 ? '' : 's'}
      </span>
      {#if problemSet.is_global}
        <span class="badge badge-sm badge-outline">Global</span>
      {/if}
      {#each problemSet.tags as tag (tag.id)}
        <TagChip
          {tag}
          href="/instructor/problemSets?tag={tag.id}"
        />
      {/each}
    </div>
  </div>

  <div class="ml-auto flex flex-row items-center gap-2">
    <ButtonLink
      href="/instructor/problemSets/{problemSet.id}"
      class="btn-square btn-primary btn-outline inline-flex items-center"
      aria-label="Open {problemSet.title}"
    >
      <ArrowRightIcon
        class="h-4 w-4"
        aria-hidden="true"
      />
    </ButtonLink>
    <ProblemSetActions
      id={problemSet.id}
      title={problemSet.title}
      {onDelete}
    />
  </div>
</div>
