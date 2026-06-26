<script lang="ts">
  import TagChip from '$lib/components/ui/TagChip.svelte';
  import BookmarkIcon from '@iconify-svelte/fa6-regular/bookmark';
  import BookmarkIconSolid from '@iconify-svelte/fa6-solid/bookmark';
  import ArrowRightIcon from '@iconify-svelte/fa6-solid/arrow-right';
  import { removeBookmark, toggleBookmark } from './bookmark';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import type { PageProps } from './$types';

  type ProblemSet = PageProps['data']['problemSets'][number];

  /** The problem set data displayed in this list item. */
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

<!-- List container -->
<div
  class="relative w-full flex flex-col gap-4 bg-base-200 hover:bg-base-100/70 rounded-lg px-4 py-4 sm:px-6 md:flex-row md:gap-8 md:items-center"
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

      <!-- Author -->
      <div
        class="text-sm text-base-content/70 line-clamp-1 overflow-hidden"
        aria-label={`Created by ${ownerName}`}
      >
        {#each problemSet.owners as owner, i (owner.id)}
          <a
            href="/problemSets?creator={owner.id}"
            class="z-20 transition-colors duration-250 hover:text-primary"
          >
            {owner.name}
          </a>{i === problemSet.owners.length - 1 ? '' : ', '}
        {/each}
      </div>
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

  <!-- Right panel: progress, bookmark, details button -->
  <div class="flex flex-row items-center gap-6 w-full md:w-80 md:gap-8">
    <!-- Progress section -->
    <div class="flex-1 flex flex-col gap-2">
      <div class="flex justify-between gap-4 text-sm text-base-content">
        <span>Progress</span>
        <span>
          {problemSet.progress.finished}/{problemSet.progress.total} problem{problemSet.progress
            .total === 1
            ? ''
            : 's'}
        </span>
      </div>
      <progress
        class="progress h-2 w-full bg-neutral problemSetProgress"
        value={problemSet.progress.finished}
        max={problemSet.progress.total}
        aria-label={`${Math.round((problemSet.progress.finished / problemSet.progress.total) * 100)}% progress`}
      ></progress>
    </div>

    <!-- Bookmark button -->
    <Button
      type="button"
      class="btn-ghost btn-square p-0 w-6 h-6 z-20"
      onclick={handleBookmarkClick}
      aria-label={problemSet.bookmarked
        ? `Remove ${problemSet.title} from bookmarks`
        : `Add ${problemSet.title} to bookmarks`}
      aria-pressed={problemSet.bookmarked}
    >
      {#if problemSet.bookmarked}
        <BookmarkIconSolid
          class="w-6 h-6"
          aria-hidden="true"
        />
      {:else}
        <BookmarkIcon
          class="w-6 h-6"
          aria-hidden="true"
        />
      {/if}
    </Button>

    <!-- Details button -->
    <ButtonLink
      href="/problemSets/{problemSet.id}"
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
