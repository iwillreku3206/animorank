<script lang="ts">
  import TagChip from '$lib/components/ui/TagChip.svelte';
  import ClickableBadge from '$lib/components/ui/badges/ClickableBadge.svelte';
  import StarIcon from '@iconify-svelte/fa6-solid/star';
  import type { PageProps } from './$types';

  type ProblemSet = PageProps['data']['problemSets'][number];

  /** The problem set data displayed in this list item. */
  let { problemSet }: { problemSet: ProblemSet } = $props();

  /** Display name of the problem set's author(s). */
  const ownerName = $derived(problemSet.owners.map((o) => o.name).join(', '));
</script>

<!-- List container. Tapping anywhere that is not a nested link opens the problem set. -->
<div
  class="relative w-full flex flex-col gap-4 bg-base-200 hover:bg-base-100/70 active:bg-base-100 transition-colors duration-250 touch-manipulation rounded-lg px-4 py-4 sm:px-6 md:flex-row md:gap-8 md:items-center"
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
          class="relative z-10 transition-colors duration-250 hover:text-primary"
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
      <!-- Title. Its stretched ::after is what makes the row itself clickable. -->
      <h2 class="font-display text-xl font-semibold">
        <a
          class="block after:absolute after:inset-0 after:rounded-lg after:content-['']"
          href="/problemSets/{problemSet.id}"
          aria-label={`${problemSet.title}`}
        >
          <!-- Tint is on the span: the link's ::after spans the whole row, so a hover on
               the link (or the h2) would follow it and fire from anywhere on the row. -->
          <span
            class="relative z-10 block line-clamp-2 overflow-hidden transition-colors duration-250 hover:text-primary"
            >{problemSet.title}</span
          >
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
            class="relative z-10 transition-colors duration-250 hover:text-primary"
          >
            {owner.name}
          </a>{i === problemSet.owners.length - 1 ? '' : ', '}
        {/each}
      </div>
    </div>

    <!-- Tags -->
    <div class="flex flex-row flex-wrap gap-2 max-h-7 overflow-hidden">
      <!-- Featured sets lead the *default* listing only, so this badge doubles as the
           explanation for why this one sits above its neighbours before any sort is
           picked. Clicking it filters the catalogue down to featured sets. -->
      {#if problemSet.featured}
        <ClickableBadge
          href="/problemSets?featured=true"
          class="badge-sm badge-primary gap-1 relative z-10"
          aria-label="Show only featured problem sets"
        >
          <StarIcon
            class="h-3 w-3"
            aria-hidden="true"
          />
          Featured
        </ClickableBadge>
      {/if}
      {#each problemSet.tags as tag (tag.id)}
        <TagChip
          {tag}
          href="/problemSets?tag={tag.id}"
          class="badge-sm badge-soft relative z-10"
        />
      {/each}
    </div>
  </div>

  <!-- Right panel: progress -->
  <div class="flex flex-row items-center gap-6 w-full md:w-80 md:gap-8">
    <!-- Progress section -->
    <div class="flex-1 flex flex-col gap-2">
      <div class="flex justify-between gap-4 text-sm text-base-content">
        <span>Progress</span>
        <span>
          {problemSet.progress.finished}/{problemSet.progress.total} problem{problemSet.progress.total === 1 ? '' : 's'}
        </span>
      </div>
      <progress
        class="progress h-2 w-full bg-neutral problemSetProgress"
        value={problemSet.progress.finished}
        max={problemSet.progress.total}
        aria-label={`${Math.round((problemSet.progress.finished / problemSet.progress.total) * 100)}% progress`}
      ></progress>
    </div>
  </div>
</div>
