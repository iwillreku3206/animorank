<script lang="ts">
  import TagChip from '$lib/components/ui/TagChip.svelte';
  import ArrowRightIcon from '@iconify-svelte/fa6-solid/arrow-right';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
  import type { PageProps } from './$types';

  type ProblemSet = PageProps['data']['problemSets'][number];

  /** The problem set data displayed in this card. */
  let { problemSet = $bindable() }: { problemSet: ProblemSet } = $props();
</script>

<!-- Card container -->
<div
  class="relative w-full flex flex-col gap-4 bg-base-200 hover:bg-base-100/70 rounded-lg p-6 max-h-96"
>
  <!-- Header: breadcrumb + bookmark icon -->
  <div class="flex items-center gap-4">
    <!-- Subject category -->
    <div class="flex-1">
      <p
        class="text-xs text-base-content/70 tracking-wide"
        aria-label="Problem set subject category"
      >
        Courses / {#if problemSet.subject}
          <a
            class="transition-colors duration-250 hover:text-primary"
            href="/problemSets?tag={problemSet.subject.id}"
          >
            {problemSet.subject?.label}
          </a>
        {:else}
          Other
        {/if}
      </p>
    </div>
  </div>

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

  <!-- Tag chips -->
  <div class="flex flex-row flex-wrap gap-2 max-h-14 overflow-hidden">
    {#each problemSet.tags as tag (tag.id)}
      <TagChip
        {tag}
        href="/problemSets?tag={tag.id}"
      />
    {/each}
  </div>

  <!-- Description -->
  <p class="flex-1 text-sm text-base-content/70 line-clamp-3 overflow-hidden whitespace-pre-wrap">
    {problemSet.description}
  </p>

  <!-- Footer: details button -->
  <div class="flex flex-row gap-8">
    <div class="flex">
      <ButtonLink
        href="/instructor/problemSets/{problemSet.id}"
        class="btn-square btn-primary btn-outline inline-flex items-center gap-2"
        aria-label={`Open ${problemSet.title} problem set details`}
      >
        <ArrowRightIcon
          class="w-4 h-4"
          aria-hidden="true"
        />
      </ButtonLink>
    </div>
  </div>
</div>
