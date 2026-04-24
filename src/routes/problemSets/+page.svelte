<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import TagChip from '$lib/components/TagChip.svelte';
  import { groupBy } from '$lib/utils/groupBy';
  import type { PageProps } from './$types';
  import ProblemSetCard from './ProblemSetCard.svelte';
  import SearchIcon from '@iconify-svelte/fa6-solid/magnifying-glass';
  import DownArrowIcon from '@iconify-svelte/fa6-solid/arrow-down';
  import XIcon from '@iconify-svelte/fa6-solid/xmark';
  import { page } from '$app/state';

  let { data }: PageProps = $props();

  const url = page.url;

  /// FILTERS
  // TAGS
  const initialTags = url.searchParams.getAll('tag');
  let tags = $state(initialTags);
  const MAX_TAGS_PER_TYPE = 5;
  const tagTypeLabelMap: Record<string, string> = {
    TAG_SUBJECT: 'Subject',
    TAG_DIFFICULTY: 'Difficulty',
    TAG_TOPIC: 'Topic'
  };
  const tagTypeOrder = ['TAG_SUBJECT', 'TAG_DIFFICULTY', 'TAG_TOPIC'];
  const sortTags = (a: (typeof data.tags)[0], b: (typeof data.tags)[0]) => {
    const countDiff = (b._count?.problemSets ?? 0) - (a._count?.problemSets ?? 0);
    if (countDiff !== 0) return countDiff;

    const orderDiff = a.order - b.order;
    if (orderDiff !== 0) return orderDiff;

    return a.label.localeCompare(b.label);
  };

  let tagsByType = $derived(
    groupBy(data.tags, (t) => t.type) as Record<string, (typeof data.tags)[0][]>
  );
  let orderedTagTypes = $derived.by(() => {
    const types = Object.keys(tagsByType);
    return [...types].sort((a, b) => {
      const idxA = tagTypeOrder.indexOf(a);
      const idxB = tagTypeOrder.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  });
  let expandedTagTypes = $state<string[]>([]);
  let visibleTagsByType = $derived.by(() => {
    const result: Record<
      string,
      {
        tags: (typeof data.tags)[0][];
        canToggle: boolean;
        expanded: boolean;
      }
    > = {};

    for (const tagType of orderedTagTypes) {
      const allTagsForType = [...tagsByType[tagType]].sort(sortTags);
      const initiallyVisibleTagIds = allTagsForType
        .slice(0, MAX_TAGS_PER_TYPE)
        .map((tag) => tag.id);
      for (const selectedTagId of tags) {
        if (
          allTagsForType.some((tag) => tag.id === selectedTagId) &&
          !initiallyVisibleTagIds.includes(selectedTagId)
        ) {
          initiallyVisibleTagIds.push(selectedTagId);
        }
      }
      const collapsedTags = allTagsForType.filter((tag) => initiallyVisibleTagIds.includes(tag.id));
      const expanded = expandedTagTypes.includes(tagType);

      result[tagType] = {
        tags: expanded ? allTagsForType : collapsedTags,
        canToggle: allTagsForType.length > collapsedTags.length,
        expanded
      };
    }

    return result;
  });

  let status = $state('');
  let filterText = $derived.by(() => {
    const filterTypes = [];
    if (tags.length !== 0) filterTypes.push('Tags');
    if (status !== '') filterTypes.push('Status');

    return filterTypes.join(', ');
  });

  // SORT
  let sortBy = $state('');
  let sortDesc = $state(true);
</script>

<main class="px-4 xl:px-32 pt-4 flex flex-col">
  <div class="flex flex-row gap-2">
    <label
      for="search"
      class="input w-full"
    >
      <SearchIcon class="h-[1em] opacity-50" />
      <input
        id="search"
        type="text"
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
      <option value="completion_pct">Sort: Difficulty</option>
    </select>
    <button
      class="select"
      popovertarget="popover-filter"
      style="anchor-name:--anchor-filter"
    >
      Filter{filterText === '' ? '' : ':'}
      {filterText}
    </button>
    <div
      class="dropdown bg-base-200 p-4 rounded-xl flex flex-col gap-2"
      popover
      id="popover-filter"
      style="position-anchor:--anchor-filter"
    >
      <h3 class="font-bold">By tag:</h3>
      <div class="flex flex-col gap-2">
        {#each orderedTagTypes as tagType (tagType)}
          <div class="flex flex-col gap-2">
            <h4 class="font-semibold">{tagTypeLabelMap[tagType] ?? tagType}</h4>
            <div class="flex flex-row flex-wrap gap-2">
              {#each visibleTagsByType[tagType].tags as tag (tag.id)}
                <TagChip
                  {tag}
                  class={tags.includes(tag.id) ? 'outline outline-accent' : ''}
                  href={() => {
                    if (tags.includes(tag.id)) tags = tags.filter((t) => t !== tag.id);
                    else tags.push(tag.id);
                  }}
                />
              {/each}
              {#if visibleTagsByType[tagType].canToggle}
                <TagChip
                  tag={{
                    id: '',
                    label: `Show ${visibleTagsByType[tagType].expanded ? 'Less' : 'More'}`,
                    color: 'TAG_COLOR_BLUE',
                    order: 99,
                    type: tagsByType[tagType][0].type
                  }}
                  href={() => {
                    if (expandedTagTypes.includes(tagType))
                      expandedTagTypes = expandedTagTypes.filter((type) => type !== tagType);
                    else expandedTagTypes = [...expandedTagTypes, tagType];
                  }}
                />
              {/if}
            </div>
          </div>
        {/each}
      </div>
      <h3 class="font-bold">By status:</h3>
      <div class="flex flex-row items-center">
        <div class="join">
          <input
            class="join-item btn"
            type="radio"
            name="filter_status"
            aria-label="Not Started"
            value="not_started"
            bind:group={status}
          />
          <input
            class="join-item btn"
            type="radio"
            name="filter_status"
            aria-label="In Progress"
            value="in_progress"
            bind:group={status}
          />
          <input
            class="join-item btn"
            type="radio"
            name="filter_status"
            aria-label="Complete"
            value="complete"
            bind:group={status}
          />
        </div>
        <button
          class="btn btn-sm btn-ghost"
          onclick={() => (status = '')}
        >
          <XIcon class="text-error w-6 h-6" />
        </button>
      </div>
      {#if data.user.type === 'student'}
        <h3 class="font-bold">By creator:</h3>
        <select class="select">
          {#each data.creators as creator (creator.id)}
            <option value={creator.id}>{creator.name}</option>
          {/each}
        </select>
      {/if}
    </div>
    <Button>Apply Filters</Button>
  </div>
  <ProblemSetCard
    problemSet={{
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
    }}
  />
</main>
