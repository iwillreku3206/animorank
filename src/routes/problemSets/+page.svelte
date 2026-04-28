<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import TagChip from '$lib/components/TagChip.svelte';
  import { groupBy } from '$lib/utils/groupBy';
  import type { PageProps } from './$types';
  import ProblemSetCard from './ProblemSetCard.svelte';
  import SearchIcon from '@iconify-svelte/fa6-solid/magnifying-glass';
  import DownArrowIcon from '@iconify-svelte/fa6-solid/arrow-down';
  import GridIcon from '@iconify-svelte/fa6-solid/grip';
  import ListIcon from '@iconify-svelte/fa6-solid/list';
  import FilterBox from './FilterBox.svelte';
  import ProblemSetListItem from './ProblemSetListItem.svelte';
  import type { Filters, ProblemSet } from './api';
  import { page } from '$app/state';

  let { data }: PageProps = $props();

  function initialFilters(): Filters {
    const params = page.url.searchParams;
    const tags = params.getAll('tag');
    let status = params.get('status') || '';
    if (['', 'not_started', 'in_progress', 'complete'].includes(status)) status = '';
    const creator = params.get('creator') || undefined;
    const bookmarked = params.get('bookmarked') === 'true';

    return {
      tags,
      status: status as Filters['status'],
      creator,
      bookmarked
    };
  }

  function initialSort() {
    const params = page.url.searchParams;
    let by = params.get('sortBy') || '';
    if (['', 'problems_solved', 'problem_count', 'completion_pct', 'difficulty'].includes(by))
      by = '';

    const order = params.get('sortOrder') === 'desc' ? 'desc' : 'asc';
    return [by, order];
  }

  function initialSearch() {
    const params = page.url.searchParams;

    return params.get('search') || '';
  }

  function initialViewMode() {
    const params = page.url.searchParams;

    return params.get('viewMode') === 'list' ? 'list' : 'grid';
  }

  function initialPage() {
    const params = page.url.searchParams;

    return parseInt(params.get('page') || '1') || 1;
  }

  let filters: Filters = $state(initialFilters());

  const [initialSortBy, initialSortOrder] = initialSort();
  let sortBy = $state(initialSortBy);
  let sortDesc = $state(initialSortOrder === 'desc');
  let search = $state(initialSearch());
  let viewMode = $state(initialViewMode());
  let pageNumber = $state(initialPage());

  const sampleProblemSet: ProblemSet = {
    id: '',
    title: 'Introduction to C Syntax and Basic Arithmetic',
    description:
      'Practice on variable declarations, using printf/scanf for data entry, and performing basic operations with integers and floats.',
    ownerName: 'Thomas James Tiam-Lee',
    bookmarked: true,
    tags: [
      {
        id: '',
        order: 0,
        color: 'TAG_COLOR_DEFAULT',
        type: 'TAG_SUBJECT',

        label: 'CCPROG1'
      },
      {
        id: '',
        order: 0,
        color: 'TAG_COLOR_YELLOW',
        type: 'TAG_DIFFICULTY',
        label: 'Intermediate'
      },
      {
        id: '',
        order: 0,
        color: 'TAG_COLOR_DEFAULT',
        type: 'TAG_TOPIC',
        label: 'I/O'
      },
      {
        id: '',
        order: 0,
        color: 'TAG_COLOR_DEFAULT',
        type: 'TAG_TOPIC',
        label: 'Data Types'
      },
      {
        id: '',
        order: 0,
        color: 'TAG_COLOR_DEFAULT',
        type: 'TAG_TOPIC',
        label: 'Arithmetic'
      }
    ],
    progress: {
      finished: 4,
      total: 10
    }
  };
</script>

<main class="px-4 xl:px-32 pt-4 flex flex-col gap-8">
  <div class="flex flex-row gap-2">
    <label
      for="search"
      class="input w-full"
    >
      <SearchIcon class="h-[1em] opacity-50" />
      <input
        id="search"
        type="text"
        bind:value={search}
      />
    </label>
    <button
      class="{sortDesc ? '' : 'rotate-180'} transition-all duration-75 disabled:text-neutral"
      onclick={() => (sortDesc = !sortDesc)}
      disabled={sortBy === ''}
    >
      <DownArrowIcon class="w-4 h-4" />
    </button>
    <select
      class="select"
      bind:value={sortBy}
    >
      <option
        value=""
        disabled
        selected
      >
        Sort
      </option>
      <option value="problems_solved">Sort: Problems Solved</option>
      <option value="problem_count">Sort: Problem Count</option>
      <option value="completion_pct">Sort: Completion %</option>
      <option value="difficulty">Sort: Difficulty</option>
    </select>
    <FilterBox
      {data}
      bind:filters
    />
    <Button>Apply Filters</Button>
    <div class="join">
      <label
        class="join-item has-checked:btn-primary has-checked:bg-primary has-checked:text-primary-content text-base-content btn bg-base-100"
      >
        <input
          class="w-0 h-0 absolute"
          type="radio"
          name="view_mode"
          value="grid"
          bind:group={viewMode}
        />
        <GridIcon class="w-6 h-6" />
      </label>
      <label
        class="join-item has-checked:btn-primary has-checked:bg-primary has-checked:text-primary-content text-base-content btn bg-base-100"
      >
        <input
          class="w-0 h-0 absolute"
          type="radio"
          name="view_mode"
          value="list"
          bind:group={viewMode}
        />
        <ListIcon class="w-6 h-6" />
      </label>
    </div>
  </div>
  <div class="{viewMode === 'list' ? 'flex flex-col' : 'grid grid-cols-3'} gap-4">
    {#each data.problemSets as problemSet (problemSet.id)}
      {#if viewMode === 'list'}
        <ProblemSetListItem {problemSet} />
      {:else}
        <ProblemSetCard {problemSet} />
      {/if}
    {/each}
  </div>
  <div class="flex flex-row w-full items-center justify-center">
    <div class="join">
      <button class="join-item btn">«</button>
      <button class="join-item btn">Page {pageNumber}/{data.pagination.pageCount}</button>
      <button class="join-item btn">»</button>
    </div>
  </div>
</main>
