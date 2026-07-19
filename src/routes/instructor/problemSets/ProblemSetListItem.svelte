<script lang="ts">
  import TagChip from '$lib/components/ui/TagChip.svelte';
  import ArrowRightIcon from '@iconify-svelte/fa6-solid/arrow-right';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
  import type { PageProps } from './$types';

  type ProblemSet = PageProps['data']['problemSets'][number];

  /** The problem set data displayed in this list item. */
  let { problemSet = $bindable() }: { problemSet: ProblemSet } = $props();
</script>

<!-- List container -->
<div
  class="relative w-full flex flex-row gap-8 bg-base-200 hover:bg-base-100/70 rounded-lg px-8 py-4 items-center"
>
  <!-- Main content: subject, tags, title, author -->
  <div class="flex-1 flex flex-col gap-2">
    <!-- Subject breadcrumb -->
    <p
      class="text-xs text-base-content/70 tracking-wide"
      aria-label="Problem set subject category"
    >
      Courses / {#if problemSet.subject}
        <a
          class="z-20 transition-colors duration-250 hover:text-primary"
          href="/problemSets?tag={problemSet.subject.id}"
        >
          {problemSet.subject.label}
        </a>
      {:else}
        Other
      {/if}
    </p>

    <!-- Title + author -->
    <div class="flex flex-col gap-1">
      <!-- Title -->
      <h2 class="font-display text-xl font-semibold line-clamp-2 overflow-hidden">
        <a
          class="hover:text-primary transition-colors duration-250"
          href="/problemSets/{problemSet.id}"
          aria-label={`${problemSet.title}`}
        >
          {problemSet.title}
        </a>
      </h2>
    </div>

    <!-- Tags -->
    <div class="flex flex-row flex-wrap gap-2 max-h-7 overflow-hidden">
      {#each problemSet.tags as tag (tag.id)}
        <TagChip
          {tag}
          href="/problemSets?tag={tag.id}"
          class="z-20"
        />
      {/each}
    </div>
  </div>

  <div class="flex flex-row items-center gap-8 ml-auto">
    <ButtonLink
      href="/instructor/problemSets/{problemSet.id}"
      class="btn-square btn-primary btn-outline z-20 inline-flex items-center"
      aria-label={`Open ${problemSet.title} problem set details`}
    >
      <ArrowRightIcon
        class="w-4 h-4"
        aria-hidden="true"
      />
    </ButtonLink>
  </div>
</div>
