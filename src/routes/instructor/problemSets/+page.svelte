<script lang="ts">
  import type { PageProps } from './$types';
  import ProblemSetCard from './ProblemSetCard.svelte';
  import ProblemSetListItem from './ProblemSetListItem.svelte';
  import FilterToolbar from '../../problemSets/FilterToolbar.svelte';
  import ActiveFilters from '../../problemSets/ActiveFilters.svelte';
  import type { Filters, SortBy } from '../../problemSets/api';
  import { parseFilters, parseSort, serializeQuery, type QueryState } from '../../problemSets/filterUtils';
  import { createProblemSet, deleteProblemSet } from './api';
  import SearchIcon from '@iconify-svelte/fa6-solid/magnifying-glass';
  import DownArrowIcon from '@iconify-svelte/fa6-solid/arrow-down';
  import CheckIcon from '@iconify-svelte/fa6-solid/check';
  import SortAscIcon from '@iconify-svelte/fa6-solid/arrow-up-short-wide';
  import SortDescIcon from '@iconify-svelte/fa6-solid/arrow-down-wide-short';
  import GridIcon from '@iconify-svelte/fa6-solid/grip';
  import ListIcon from '@iconify-svelte/fa6-solid/list';
  import PlusIcon from '@iconify-svelte/fa6-solid/plus';
  import { afterNavigate, goto, invalidateAll, replaceState } from '$app/navigation';
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
   * The URL is the single source of truth for sort, search, pagination and view.
   * Filters keep a local `draft` so rapid multi-selects feel instant; it is
   * debounced back into the URL and overwritten by any external navigation.
   * Mirrors the student problem sets page.
   */
  let draft = $state.raw(parseFilters(page.url.searchParams));
  afterNavigate((navigation) => {
    if (navigation.type === 'goto') return;
    cancelCommit();
    draft = parseFilters(page.url.searchParams);
  });

  const sort = $derived(parseSort(page.url.searchParams));
  const sortBy = $derived(sort.by);
  const sortDesc = $derived(sort.desc);
  const searchApplied = $derived(page.url.searchParams.get('search') || '');
  const pageNumber = $derived(parseInt(page.url.searchParams.get('page') || '1') || 1);
  const problemSets = $derived(data.problemSets);

  let searchInput = $state(page.url.searchParams.get('search') || '');
  let viewMode = $state(page.url.searchParams.get('viewMode') === 'list' ? 'list' : 'grid');

  const currentSortLabel = $derived(SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? '');
  const allTags = $derived([...data.subjectTags, ...data.difficultyTags, ...data.topicTags]);

  let newTitle = $state('');
  let creating = $state(false);
  let actionError = $state('');

  function current(): QueryState {
    return { filters: draft, search: searchApplied, sortBy, sortDesc, viewMode, pageNumber };
  }

  function navigate(next: QueryState, replace = false) {
    const qs = serializeQuery(next);
    goto(qs ? `?${qs}` : page.url.pathname, {
      keepFocus: true,
      noScroll: true,
      replaceState: replace
    });
  }

  const COMMIT_DELAY_MS = 300;
  let commitTimer: ReturnType<typeof setTimeout> | null = null;

  function cancelCommit() {
    if (commitTimer !== null) {
      clearTimeout(commitTimer);
      commitTimer = null;
    }
  }

  onDestroy(cancelCommit);

  function stageFilters(next: Filters) {
    draft = next;
    cancelCommit();
    commitTimer = setTimeout(() => {
      commitTimer = null;
      navigate({ ...current(), pageNumber: 1 }, true);
    }, COMMIT_DELAY_MS);
  }

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

  // Display-only: reflected into the URL without re-running the server load.
  function setViewMode(mode: 'grid' | 'list') {
    viewMode = mode;
    const qs = serializeQuery({ ...current(), viewMode: mode });
    replaceState(qs ? `${page.url.pathname}?${qs}` : page.url.pathname, {});
  }

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title || creating) return;
    creating = true;
    actionError = '';
    try {
      const id = await createProblemSet(title);
      newTitle = '';
      await goto(`/instructor/problemSets/${id}`);
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'Could not create the problem set.';
    } finally {
      creating = false;
    }
  }

  async function handleDelete(id: string) {
    actionError = '';
    try {
      await deleteProblemSet(id);
      // Re-run the load so pagination and counts stay correct rather than
      // splicing the row out of a page whose total has changed.
      await invalidateAll();
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'Could not delete the problem set.';
    }
  }
</script>

<Seo
  title="Your problem sets"
  noindex
/>

<main class="app-gutter flex flex-col gap-4 pt-4">
  <!-- Create -->
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
    <TextInput
      class="min-w-0 flex-1"
      type="text"
      placeholder="New problem set title…"
      bind:value={newTitle}
      onkeydown={(e) => {
        if (e.key === 'Enter') handleCreate();
      }}
    />
    <Button
      class="btn-primary shrink-0"
      onclick={handleCreate}
      disabled={creating || newTitle.trim() === ''}
    >
      <PlusIcon class="h-4 w-4" />
      {creating ? 'Creating…' : 'Create problem set'}
    </Button>
  </div>

  {#if actionError}
    <div
      class="alert alert-error"
      role="alert"
    >
      {actionError}
    </div>
  {/if}

  <!-- Search + sort + view -->
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
    <div class="flex min-w-0 flex-1 gap-2">
      <TextInput
        class="min-w-0 flex-1"
        type="text"
        placeholder="Search your problem sets…"
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
        <SearchIcon class="h-4 w-4" /> Search
      </Button>
    </div>

    <div class="flex gap-2">
      <div class="dropdown dropdown-end flex-1 sm:flex-none">
        <Button
          tabindex={0}
          class="w-full justify-start gap-2 whitespace-nowrap sm:w-56"
        >
          {#if sortBy}
            {#if sortDesc}
              <SortDescIcon class="h-4 w-4 opacity-70" />
            {:else}
              <SortAscIcon class="h-4 w-4 opacity-70" />
            {/if}
          {/if}
          Sort{currentSortLabel ? `: ${currentSortLabel}` : ''}
          <DownArrowIcon class="ms-auto h-3 w-3 shrink-0 opacity-40" />
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
                    : 'text-base-content/70'}"
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
          <GridIcon class="h-5 w-5" />
        </Button>
        <Button
          class="join-item btn-square {viewMode === 'list' ? 'btn-primary' : ''}"
          onclick={() => setViewMode('list')}
          aria-label="List view"
          aria-pressed={viewMode === 'list'}
        >
          <ListIcon class="h-5 w-5" />
        </Button>
      </div>
    </div>
  </div>

  <FilterToolbar
    filters={draft}
    onChange={stageFilters}
    onCommit={commitFiltersNow}
    subjectTags={data.subjectTags}
    difficultyTags={data.difficultyTags}
    topicTags={data.topicTags}
    creators={data.creators}
    showCreator={true}
  />

  <ActiveFilters
    filters={draft}
    onChange={stageFilters}
    {allTags}
    creators={data.creators}
  />

  <!-- Results -->
  <div class="{viewMode === 'list' ? 'flex flex-col' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} gap-4">
    {#each problemSets as problemSet (problemSet.id)}
      {#if viewMode === 'list'}
        <ProblemSetListItem
          {problemSet}
          onDelete={() => handleDelete(problemSet.id)}
        />
      {:else}
        <ProblemSetCard
          {problemSet}
          onDelete={() => handleDelete(problemSet.id)}
        />
      {/if}
    {:else}
      <div class="col-span-full py-12 text-center text-base-content/50">No problem sets match these filters.</div>
    {/each}
  </div>

  <!-- Pagination -->
  <div class="flex w-full flex-row items-center justify-center">
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
