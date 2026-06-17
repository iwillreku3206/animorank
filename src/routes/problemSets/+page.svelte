<script lang="ts">
  import type { PageProps } from './$types';
  import ProblemSetCard from './ProblemSetCard.svelte';
  import ProblemSetListItem from './ProblemSetListItem.svelte';
  import FilterToolbar from './FilterToolbar.svelte';
  import ActiveFilters from './ActiveFilters.svelte';
  import type { Filters, SortBy } from './api';
  import { parseFilters, parseSort, serializeQuery } from './filterUtils';
  import SearchIcon from '@iconify-svelte/fa6-solid/magnifying-glass';
  import DownArrowIcon from '@iconify-svelte/fa6-solid/arrow-down';
  import CheckIcon from '@iconify-svelte/fa6-solid/check';
  import SortAscIcon from '@iconify-svelte/fa6-solid/arrow-up-short-wide';
  import SortDescIcon from '@iconify-svelte/fa6-solid/arrow-down-wide-short';
  import GridIcon from '@iconify-svelte/fa6-solid/grip';
  import ListIcon from '@iconify-svelte/fa6-solid/list';
  import { goto, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { onDestroy } from 'svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';

  let { data }: PageProps = $props();

  const SORT_OPTIONS: { value: SortBy; label: string }[] = [
    { value: 'problems_solved', label: 'Problems Solved' },
    { value: 'problem_count', label: 'Problem Count' },
    { value: 'completion_pct', label: 'Completion %' },
    { value: 'difficulty', label: 'Difficulty' }
  ];

  // --- Initial state from the URL ---
  let filters: Filters = $state(parseFilters(page.url.searchParams));
  const _sort = parseSort(page.url.searchParams);
  let sortBy = $state(_sort.by);
  let sortDesc = $state(_sort.desc);
  let searchInput = $state(page.url.searchParams.get('search') || '');
  let searchApplied = $state(page.url.searchParams.get('search') || '');
  let viewMode = $state(page.url.searchParams.get('viewMode') === 'list' ? 'list' : 'grid');
  let pageNumber = $state(parseInt(page.url.searchParams.get('page') || '1') || 1);

  // svelte-ignore state_referenced_locally
  let problemSets = $state(data.problemSets);
  // Re-sync the displayed list whenever the server returns new results.
  $effect(() => {
    problemSets = data.problemSets;
  });

  const currentSortLabel = $derived(SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? '');
  const allTags = $derived([...data.subjectTags, ...data.difficultyTags, ...data.topicTags]);

  function buildParams(): string {
    return serializeQuery({
      filters,
      search: searchApplied,
      sortBy,
      sortDesc,
      viewMode,
      pageNumber
    });
  }

  function commit() {
    const qs = buildParams();
    goto(qs ? `?${qs}` : page.url.pathname, { keepFocus: true, noScroll: true });
  }

  let applyTimer: ReturnType<typeof setTimeout> | undefined;
  function scheduleCommit() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(commit, 350);
  }
  onDestroy(() => clearTimeout(applyTimer));

  function commitSearch() {
    searchApplied = searchInput;
    pageNumber = 1;
    commit();
  }

  function goToPage(n: number) {
    if (n < 1 || n > data.pagination.pageCount) return;
    pageNumber = n;
    commit();
  }

  // Auto-apply (debounced) when filters or sort change; reset to the first page.
  let firstFilterRun = true;
  $effect(() => {
    void [
      filters.include,
      filters.exclude,
      filters.topicMatchAll,
      filters.statuses,
      filters.creators,
      filters.creatorMatchAll,
      filters.bookmarked,
      sortBy,
      sortDesc
    ];
    if (firstFilterRun) {
      firstFilterRun = false;
      return;
    }
    pageNumber = 1;
    scheduleCommit();
  });

  // View mode is display-only — update the URL without re-querying the server.
  let firstViewRun = true;
  $effect(() => {
    void viewMode;
    if (firstViewRun) {
      firstViewRun = false;
      return;
    }
    const qs = buildParams();
    replaceState(qs ? `${page.url.pathname}?${qs}` : page.url.pathname, {});
  });
</script>

<main class="px-4 xl:px-32 pt-4 flex flex-col gap-4">
  <!-- Top bar: search + sort + view -->
  <div class="flex flex-row gap-2 items-center">
    <label class="input flex-1 min-w-0">
      <SearchIcon class="h-[1em] opacity-50" />
      <input
        type="text"
        placeholder="Search problem sets…"
        bind:value={searchInput}
        onkeydown={(e) => {
          if (e.key === 'Enter') commitSearch();
        }}
      />
    </label>
    <Button
      class="btn-primary shrink-0"
      onclick={commitSearch}
    >
      <SearchIcon class="w-4 h-4" /> Search
    </Button>

    <div class="dropdown dropdown-end shrink-0">
      <Button
        tabindex={0}
        class="w-56 gap-2 shrink-0 justify-start whitespace-nowrap"
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
                onclick={() => (sortBy = opt.value)}
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
            onclick={() => (sortDesc = false)}
            aria-pressed={!sortDesc}
          >
            <SortAscIcon class="h-3.5 w-3.5" /> Asc
          </Button>
          <Button
            class="join-item btn-sm flex-1 {sortDesc ? 'btn-primary' : ''}"
            disabled={!sortBy}
            onclick={() => (sortDesc = true)}
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
        onclick={() => (viewMode = 'grid')}
        aria-label="Grid view"
        aria-pressed={viewMode === 'grid'}
      >
        <GridIcon class="w-5 h-5" />
      </Button>
      <Button
        class="join-item btn-square {viewMode === 'list' ? 'btn-primary' : ''}"
        onclick={() => (viewMode = 'list')}
        aria-label="List view"
        aria-pressed={viewMode === 'list'}
      >
        <ListIcon class="w-5 h-5" />
      </Button>
    </div>
  </div>

  <!-- Filter toolbar -->
  <FilterToolbar
    bind:filters
    subjectTags={data.subjectTags}
    difficultyTags={data.difficultyTags}
    topicTags={data.topicTags}
    creators={data.creators}
    showCreator={data.user.type === 'student'}
  />

  <!-- Active filter chips -->
  <ActiveFilters
    bind:filters
    {allTags}
    creators={data.creators}
  />

  <!-- Results -->
  <div class="{viewMode === 'list' ? 'flex flex-col' : 'grid grid-cols-4'} gap-4">
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
