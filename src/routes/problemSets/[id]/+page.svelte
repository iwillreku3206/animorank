<script lang="ts">
  import TagChip from '$lib/components/ui/TagChip.svelte';
  import BookmarkIcon from '@iconify-svelte/fa6-regular/bookmark';
  import BookmarkIconSolid from '@iconify-svelte/fa6-solid/bookmark';
  import PlayIcon from '@iconify-svelte/fa6-solid/play';
  import type { PageProps } from './$types';
  import ProblemListItem from './ProblemListItem.svelte';
  import { removeBookmark, toggleBookmark } from '../bookmark';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
  import transform from '@diplodoc/transform';
  import YfmStaticView from '$lib/components/content/YfmStaticView.svelte';
  import { transform as latex } from '@diplodoc/latex-extension/plugin';
  import { transform as mermaid } from '@diplodoc/mermaid-extension/plugin';
  import { transform as transformHTML } from '@diplodoc/html-extension';
  import defaultPlugins from '@diplodoc/transform/lib/plugins';

  let { data }: PageProps = $props();

  const { problemSet, globalProblemSolvers, globalProblemAttempts } = $derived(data);
  // svelte-ignore state_referenced_locally
  let isBookmarked = $state(data.bookmarked);

  async function handleBookmarkClick() {
    if (isBookmarked) {
      await removeBookmark(problemSet.id);
      isBookmarked = false;
    } else {
      await toggleBookmark(problemSet.id);
      isBookmarked = true;
    }
  }

  let tags = $derived([problemSet.difficulty, ...problemSet.topics].filter((x) => !!x));
  let progress = $derived(
    problemSet.problems.reduce((prev, next) => [prev[0] + (next.status === 'done' ? 1 : 0), prev[1] + 1], [0, 0])
  );
</script>

<main class="flex flex-col">
  <header class="flex flex-col gap-8 py-8 app-gutter border-b border-base-100 lg:flex-row">
    <!-- Col 1: Problem set details -->
    <div class="flex flex-[3] flex-col gap-4">
      <!-- Subject category breadcrumb -->
      <p
        class="text-sm text-base-content/70 tracking-wide"
        aria-label="Problem set subject category"
      >
        Courses / {#if problemSet.subject}
          <a
            class="text-base-content/70 transition-colors duration-250 hover:text-primary"
            href="/problemSets?tag={problemSet.subject.id}"
          >
            {problemSet.subject?.label}
          </a>
        {:else}
          Other
        {/if}
      </p>

      <!-- Title + author-->
      <div class="flex flex-col gap-2">
        <!-- Title -->
        <h1 class="font-display text-3xl sm:text-4xl font-semibold line-clamp-2 overflow-hidden break-words">
          {problemSet.title}
        </h1>

        <!-- Author -->
        <p class="text-base-content/70">
          {#each problemSet.collaborators as collaborator, i (collaborator.id)}
            <a
              href="/problemSets?creator={collaborator.id}"
              class="transition-colors duration-250 hover:text-primary"
            >
              {collaborator.name}
            </a>
            {i === problemSet.collaborators.length - 1 ? '' : ','}
          {/each}
        </p>
      </div>

      <!-- Tags -->
      <div class="flex flex-row flex-wrap gap-2 max-h-[3.5rem] overflow-hidden">
        {#each tags as tag (tag.id)}<TagChip
            {tag}
            href="/problemSets?tag={tag.id}"
          />{/each}
      </div>

      <!-- Description (YFM markup from the instructor editor, rendered) -->
      <div class="text-base-content/70 line-clamp-3 overflow-hidden">
        <YfmStaticView
          html={transform(problemSet.description ?? '', {
            allowHTML: true,
            plugins: [
              latex({ bundle: false, runtime: 'extension:latex' }),
              mermaid({ bundle: false, runtime: 'extension:mermaid' }),
              transformHTML({ bundle: false, runtimeJsPath: 'extension:html' }),
              ...defaultPlugins
            ]
          }).result.html}
        />
      </div>
    </div>

    <!-- Col 2: Actions -->
    <div class="flex flex-[1] flex-col gap-4">
      <!-- Progress row -->
      <div class="flex flex-col w-full gap-2">
        <!-- Progress text -->
        <div class="flex justify-between gap-4 text-sm text-base-content">
          <span> Progress </span>
          <span>
            {progress[0]}/{progress[1]} problem{progress[1] === 1 ? '' : 's'}
          </span>
        </div>

        <!-- Progress bar -->
        <progress
          class="progress h-2 w-full bg-neutral problemSetProgress"
          value={progress[0]}
          max={progress[1]}
          aria-label={`${Math.round((progress[0] / progress[1]) * 100)}% progress`}
        ></progress>
      </div>

      <Button
        class="btn-neutral btn-outline gap-2 w-full"
        onclick={handleBookmarkClick}
        aria-label={isBookmarked ? `Remove ${problemSet.title} from bookmarks` : `Add ${problemSet.title} to bookmarks`}
      >
        {#if isBookmarked}
          <BookmarkIconSolid class="w-5 h-5" />
          Bookmarked
        {:else}
          <BookmarkIcon class="w-5 h-5" />
          Bookmark
        {/if}
      </Button>

      <ButtonLink
        class="btn-primary gap-2 w-full"
        href="/problem/{problemSet.problems[0].id}"
        aria-label={`Start practicing ${problemSet.title} problem set`}
      >
        <PlayIcon
          class="w-5 h-5"
          aria-hidden="true"
        />
        Start Practicing
      </ButtonLink>
    </div>
  </header>

  <div class="flex flex-col app-gutter gap-4 py-8">
    {#each problemSet.problems as problem (problem.id)}
      <ProblemListItem
        {problem}
        problemSolvers={globalProblemSolvers[problem.id]}
        problemAttempts={globalProblemAttempts[problem.id]}
      />
    {/each}
  </div>
</main>
