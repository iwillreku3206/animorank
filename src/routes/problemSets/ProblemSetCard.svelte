<script lang="ts">
  import TagChip from '$lib/components/ui/TagChip.svelte';
  import BookmarkIcon from '@iconify-svelte/fa6-regular/bookmark';
  import BookmarkIconSolid from '@iconify-svelte/fa6-solid/bookmark';
  import ArrowRightIcon from '@iconify-svelte/fa6-solid/arrow-right';
  import { removeBookmark, toggleBookmark } from './bookmark';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
  import type { PageProps } from './$types';

  type ProblemSet = PageProps['data']['problemSets'][number];

  /** The problem set data displayed in this card. */
  let { problemSet = $bindable() }: { problemSet: ProblemSet } = $props();

  /** Display name of the problem set's author(s). */
  const ownerName = $derived(problemSet.owners.map((o) => o.name).join(', '));

  /**
   * Toggle the bookmarked state for this problem set.
   */
  async function handleBookmarkClick() {
    if (problemSet.bookmarked) {
      await removeBookmark(problemSet.id);
      problemSet.bookmarked = false;
    } else {
      await toggleBookmark(problemSet.id);
      problemSet.bookmarked = true;
    }
  }
</script>

<!-- Card container -->
<div
  class="relative w-full flex flex-col gap-4 bg-base-200 hover:bg-base-100/70 rounded-lg p-6 max-h-[384px]"
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

    <!-- Bookmark button -->
    <button
      type="button"
      class="btn btn-ghost btn-square p-0 w-4 h-4"
      onclick={handleBookmarkClick}
      aria-label={problemSet.bookmarked
        ? `Remove ${problemSet.title} from bookmarks`
        : `Add ${problemSet.title} to bookmarks`}
      aria-pressed={problemSet.bookmarked}
    >
      {#if problemSet.bookmarked}
        <BookmarkIconSolid
          class="w-4 h-4"
          aria-hidden="true"
        />
      {:else}
        <BookmarkIcon
          class="w-4 h-4"
          aria-hidden="true"
        />
      {/if}
    </button>
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

    <!-- Author -->
    <div
      class="text-sm text-base-content/70 line-clamp-1 overflow-hidden"
      aria-label={`Created by ${ownerName}`}
    >
      {#each problemSet.owners as owner, i (owner.id)}
        <a
          href="/problemSets?creator={owner.id}"
          class="transition-colors duration-250 hover:text-primary"
        >
          {owner.name}
        </a>{i === problemSet.owners.length - 1 ? '' : ', '}
      {/each}
    </div>
  </div>

  <!-- Tag chips -->
  <div class="flex flex-row flex-wrap gap-2 max-h-[3.5rem] overflow-hidden">
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

  <!-- Footer: progress row and details button -->
  <div class="flex flex-row gap-8">
    <div class="flex-1 flex-col gap-2">
      <!-- Progress text -->
      <div class="flex justify-between gap-4 text-sm text-base-content">
        <span> Progress </span>
        <span>
          {problemSet.progress.finished}/{problemSet.progress.total} problem{problemSet.progress
            .total === 1
            ? ''
            : 's'}
        </span>
      </div>

      <!-- Progress bar -->
      <progress
        class="progress h-2 w-full bg-neutral problemSetProgress"
        value={problemSet.progress.finished}
        max={problemSet.progress.total}
        aria-label={`${Math.round((problemSet.progress.finished / problemSet.progress.total) * 100)}% progress`}
      ></progress>
    </div>

    <!-- Details button -->
    <div class="flex">
      <ButtonLink
        href="/problemSets/{problemSet.id}"
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
