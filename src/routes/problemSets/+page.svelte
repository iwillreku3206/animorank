<script lang="ts">
  import type { PageProps } from './$types';
  import ProblemSetCard from './ProblemSetCard.svelte';
  import ProblemSetListItem from './ProblemSetListItem.svelte';
  import FilterToolbar from './FilterToolbar.svelte';
  import ActiveFilters from './ActiveFilters.svelte';
  import type { Filters, SortBy } from './api';
  import { parseFilters, parseSort, serializeQuery, type QueryState } from './filterUtils';
  import SearchIcon from '@iconify-svelte/fa6-solid/magnifying-glass';
  import DownArrowIcon from '@iconify-svelte/fa6-solid/arrow-down';
  import CheckIcon from '@iconify-svelte/fa6-solid/check';
  import SortAscIcon from '@iconify-svelte/fa6-solid/arrow-up-short-wide';
  import SortDescIcon from '@iconify-svelte/fa6-solid/arrow-down-wide-short';
  import GridIcon from '@iconify-svelte/fa6-solid/grip';
  import ListIcon from '@iconify-svelte/fa6-solid/list';
  import { afterNavigate, goto, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { onDestroy } from 'svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import Seo from '$lib/components/layout/Seo.svelte';

  let { data }: PageProps = $props();

  const SORT_OPTIONS: { value: SortBy; label: string }[] = [
    { value: 'problems_solved', label: 'Problems Solved' },
    { value: 'problem_count', label: 'Problem Count' },
    { value: 'completion_pct', label: 'Completion %' },
    { value: 'difficulty', label: 'Difficulty' }
  ];

  /**
   * The URL is the single source of truth for all state (sort, search, pagination, view).
   *
   * Exception: Filters use a local `draft` state to keep rapid multi-selects feeling instant.
   * This draft debounces changes back to the URL, but is immediately overwritten by URL
   * updates (like back/forward navigation or tag clicks) to ensure external actions always win.
   */
  let draft = $state.raw(parseFilters(page.url.searchParams));
  afterNavigate(() => {
    draft = parseFilters(page.url.searchParams);
  });

  const sort = $derived(parseSort(page.url.searchParams));
  const sortBy = $derived(sort.by);
  const sortDesc = $derived(sort.desc);
  const searchApplied = $derived(page.url.searchParams.get('search') || '');
  const pageNumber = $derived(parseInt(page.url.searchParams.get('page') || '1') || 1);
  const problemSets = $derived(data.problemSets);

  // Transient text being typed; only reflected into the URL on submit.
  let searchInput = $state(page.url.searchParams.get('search') || '');

  // View mode is display-only and persisted via replaceState, which does not
  // update page.url — so it's held as local state rather than derived from the URL.
  let viewMode = $state(page.url.searchParams.get('viewMode') === 'list' ? 'list' : 'grid');

  const currentSortLabel = $derived(SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? '');
  const allTags = $derived([...data.subjectTags, ...data.difficultyTags, ...data.topicTags]);

  /**
   * Current query state as a plain object, for spreading into a partial update.
   * `filters` comes from the live `draft`, not the URL, so every navigation
   * carries the latest (possibly uncommitted) filter edits — an immediate
   * sort/search/page change can't drop a pending multi-select.
   */
  function current(): QueryState {
    return { filters: draft, search: searchApplied, sortBy, sortDesc, viewMode, pageNumber };
  }

  /** Navigate to a new query state (re-runs the server load). */
  function navigate(next: QueryState, replace = false) {
    const qs = serializeQuery(next);
    goto(qs ? `?${qs}` : page.url.pathname, {
      keepFocus: true,
      noScroll: true,
      replaceState: replace
    });
  }

  // Filter commits are debounced so a burst of multi-select clicks produces a
  // single navigation. They replace history (rather than push) to avoid spam.
  // Immediate commits (sort/search/pagination/bookmarked/clear) cancel any
  // pending filter commit first — they already carry the latest draft.
  const COMMIT_DELAY_MS = 300;
  let commitTimer: ReturnType<typeof setTimeout> | null = null;

  function cancelCommit() {
    if (commitTimer !== null) {
      clearTimeout(commitTimer);
      commitTimer = null;
    }
  }

  onDestroy(cancelCommit);

  /** Stage a filter edit for instant UI, then commit it to the URL after a pause. */
  function stageFilters(next: Filters) {
    draft = next;
    cancelCommit();
    commitTimer = setTimeout(() => {
      commitTimer = null;
      // Fire-time capture: current() reads the latest draft and the current
      // URL-derived sort/search, so a concurrent immediate change isn't clobbered.
      navigate({ ...current(), pageNumber: 1 }, true);
    }, COMMIT_DELAY_MS);
  }

  /** Commit a filter edit to the URL right away (no debounce). */
  function commitFiltersNow(next: Filters) {
    draft = next;
    cancelCommit();
    navigate({ ...current(), pageNumber: 1 }, true);
  }

  function setSort(by: SortBy, desc: boolean) {
    cancelCommit();
    navigate({ ...current(), sortBy: by, sortDesc: desc, pageNumber: 1 });
  }

  function commitSearch() {
    cancelCommit();
    navigate({ ...current(), search: searchInput, pageNumber: 1 });
  }

  function goToPage(n: number) {
    if (n < 1 || n > data.pagination.pageCount) return;
    cancelCommit();
    navigate({ ...current(), pageNumber: n });
  }

  // View mode is display-only — update the URL without re-querying the server.
  function setViewMode(mode: 'grid' | 'list') {
    viewMode = mode;
    const qs = serializeQuery({ ...current(), viewMode: mode });
    replaceState(qs ? `${page.url.pathname}?${qs}` : page.url.pathname, {});
  }
</script>

<Seo
  title="Problem sets"
  noindex
/>

<main class="app-gutter pt-4 flex flex-col gap-4">
  <!-- Top bar: search + sort + view. Stacks into two rows on phones, single row
       from sm up. -->
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
    <div class="flex flex-1 gap-2 min-w-0">
      <TextInput
        class="flex-1 min-w-0"
        type="text"
        placeholder="Search problem sets…"
        bind:value={searchInput}
        onkeydown={(e) => {
          if (e.key === 'Enter') commitSearch();
        }}
      >
        {#snippet leading()}
          <SearchIcon />
        {/snippet}
      </TextInput>
      <Button
        class="btn-primary shrink-0"
        onclick={commitSearch}
      >
        <SearchIcon class="w-4 h-4" /> Search
      </Button>
    </div>

    <div class="flex gap-2">
      <div class="dropdown dropdown-end flex-1 sm:flex-none">
        <Button
          tabindex={0}
          class="w-full sm:w-56 gap-2 justify-start whitespace-nowrap"
        >
          {#if sortBy}
            {#if sortDesc}
              <SortDescIcon class="w-4 h-4 opacity-70" />
            {:else}
              <SortAscIcon class="w-4 h-4 opacity-70" />
            {/if}
          {/if}
          Sort{currentSortLabel ? `: ${currentSortLabel}` : ''}
          <DownArrowIcon class="w-3 h-3 shrink-0 opacity-40 ms-auto" />
        </Button>

        <div
          tabindex="-1"
          class="dropdown-content z-50 mt-2 w-64 rounded-box border border-base-content/10 bg-base-100 p-1.5 shadow-xl"
        >
          <ul class="flex flex-col gap-0.5">
            {#each SORT_OPTIONS as opt (opt.value)}
              <li>
                <button
                  class="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors outline-none hover:bg-base-200 focus-visible:bg-base-200 {sortBy ===
                  opt.value
                    ? 'font-medium text-primary'
                    : 'text-base-content/80'}"
                  onclick={() => setSort(opt.value, sortDesc)}
                  aria-pressed={sortBy === opt.value}
                >
                  {opt.label}
                  {#if sortBy === opt.value}
                    <CheckIcon class="h-3.5 w-3.5" />
                  {/if}
                </button>
              </li>
            {/each}
          </ul>

          <div class="my-1.5 border-t border-base-content/10"></div>

          <div class="join w-full">
            <Button
              class="join-item btn-sm flex-1 {sortDesc ? '' : 'btn-primary'}"
              disabled={!sortBy}
              onclick={() => setSort(sortBy, false)}
              aria-pressed={!sortDesc}
            >
              <SortAscIcon class="h-3.5 w-3.5" /> Asc
            </Button>
            <Button
              class="join-item btn-sm flex-1 {sortDesc ? 'btn-primary' : ''}"
              disabled={!sortBy}
              onclick={() => setSort(sortBy, true)}
              aria-pressed={sortDesc}
            >
              <SortDescIcon class="h-3.5 w-3.5" /> Desc
            </Button>
          </div>
        </div>
      </div>

      <div
        class="join"
        role="group"
        aria-label="View mode"
      >
        <Button
          class="join-item btn-square {viewMode === 'grid' ? 'btn-primary' : ''}"
          onclick={() => setViewMode('grid')}
          aria-label="Grid view"
          aria-pressed={viewMode === 'grid'}
        >
          <GridIcon class="w-5 h-5" />
        </Button>
        <Button
          class="join-item btn-square {viewMode === 'list' ? 'btn-primary' : ''}"
          onclick={() => setViewMode('list')}
          aria-label="List view"
          aria-pressed={viewMode === 'list'}
        >
          <ListIcon class="w-5 h-5" />
        </Button>
      </div>
    </div>
  </div>

  <!-- Filter toolbar -->
  <FilterToolbar
    filters={draft}
    onChange={stageFilters}
    onCommit={commitFiltersNow}
    subjectTags={data.subjectTags}
    difficultyTags={data.difficultyTags}
    topicTags={data.topicTags}
    creators={data.creators}
    showCreator={data.user.type === 'student'}
  />

  <!-- Active filter chips -->
  <ActiveFilters
    filters={draft}
    onChange={stageFilters}
    {allTags}
    creators={data.creators}
  />

  <!-- Results -->
  <div
    class="{viewMode === 'list'
      ? 'flex flex-col'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} gap-4"
  >
    {#each problemSets as problemSet, i (problemSet.id)}
      {#if viewMode === 'list'}
        <ProblemSetListItem bind:problemSet={problemSets[i]} />
      {:else}
        <ProblemSetCard bind:problemSet={problemSets[i]} />
      {/if}
    {/each}
  </div>

  <!-- Pagination -->
  <div class="flex flex-row w-full items-center justify-center">
    <div class="join">
      <Button
        class="join-item"
        onclick={() => goToPage(pageNumber - 1)}
        disabled={pageNumber <= 1}>«</Button
      >
      <Button class="join-item">Page {pageNumber}/{data.pagination.pageCount}</Button>
      <Button
        class="join-item"
        onclick={() => goToPage(pageNumber + 1)}
        disabled={pageNumber >= data.pagination.pageCount}>»</Button
      >
    </div>
  </div>
</main>
