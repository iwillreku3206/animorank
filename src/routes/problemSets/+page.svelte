<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import TagChip from '$lib/components/TagChip.svelte';
  import { arrayToHashMap } from '$lib/utils/arrayToHashMap';
  import { groupBy } from '$lib/utils/groupBy';
  import type { PageProps } from './$types';
  import ProblemSetCard from './ProblemSetCard.svelte';
  import SearchIcon from '@iconify-svelte/fa6-solid/magnifying-glass';
  import { page } from '$app/state';

  let { data }: PageProps = $props();

  const url = page.url;

  const initialTags = url.searchParams.getAll('tag');
  let tagsMap = $derived(arrayToHashMap(data.tags, (t) => t.id));
  let tags = $state(initialTags);
  let shortenedTags = $derived.by(() => {
    const final: (typeof data.tags)[0][] = [];

    const tagsByType = groupBy(data.tags, (t) => t.type) as Record<string, (typeof data.tags)[0][]>;
    const selectedTagsByType = groupBy(initialTags, (t) => tagsMap[t].type) as Record<
      string,
      string[]
    >;

    const tagTypes = Object.keys(tagsByType);

    for (const tagType of tagTypes) {
      if (tagType in selectedTagsByType) {
        for (const tag of selectedTagsByType[tagType]) {
          final.push(tagsMap[tag]);
        }
      }

      let remaining: number = 5;
      if (tagType in selectedTagsByType) remaining -= selectedTagsByType[tagType].length;
      remaining = Math.max(0, remaining);

      for (const tag of tagsByType[tagType]) {
        if (remaining === 0) break;
        if (tagType in selectedTagsByType && selectedTagsByType[tagType].includes(tag.id)) continue;
        console.log(tag);
        final.push(tag);
        remaining--;
      }
    }

    return final;
  });

  let shortenTagList = $state(true);
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
    <select class="select">
      <option
        value=""
        disabled
        selected
      >
        Sort
      </option>
      <option value="problems_solved">Problems Solved</option>
      <option value="problem_count">Problem Count</option>
      <option value="completion_pct">Completion %</option>
      <option value="completion_pct">Difficulty</option>
    </select>
    <button
      class="select"
      popovertarget="popover-filter"
      style="anchor-name:--anchor-filter"
    >
      Filter
    </button>
    <div
      class="dropdown bg-base-200 p-4 rounded-xl flex flex-col gap-2"
      popover
      id="popover-filter"
      style="position-anchor:--anchor-filter"
    >
      <div>By tag:</div>
      <div class="flex flex-row flex-wrap gap-2">
        {#each shortenTagList ? shortenedTags : data.tags as tag (tag.id)}
          <TagChip
            {tag}
            class={tags.includes(tag.id) ? 'outline outline-accent' : ''}
            href={() => {
              if (tags.includes(tag.id)) tags = tags.filter((t) => t !== tag.id);
              else tags.push(tag.id);
            }}
          />
        {/each}
      </div>
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
