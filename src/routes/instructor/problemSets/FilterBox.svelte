<script lang="ts">
  import TagChip from '$lib/components/TagChip.svelte';
  import { groupBy } from '$lib/utils/groupBy';
  import { flip } from 'svelte/animate';
  const FLIP_DURATION = 30;
  import type { PageProps } from './$types';
  import XIcon from '@iconify-svelte/fa6-solid/xmark';
  import type { Filters } from '../../problemSets/api';

  let { data, filters = $bindable() }: { data: PageProps['data']; filters: Filters } = $props();
  let { creators, topicTags, difficultyTags, subjectTags, user } = $derived(data);

  const allTags = $derived([...topicTags, ...difficultyTags, ...subjectTags]);

  type Tag = (typeof allTags)[0];

  let tagsByType = $derived(groupBy(allTags, (t: Tag) => t.type));
  let tagTypes = $derived(Object.keys(tagsByType) as (keyof typeof tagsByType)[]);

  type TagMap = Record<keyof typeof tagsByType, Tag[]>;

  let [tagsByTypeSelectedFirst, numberSelectedByType] = $derived.by(() => {
    const tagsMap: Partial<TagMap> = {};
    const numberSelectedByType: Partial<Record<keyof typeof tagsByType, number>> = {};
    for (const tagType of tagTypes) {
      const grouped = groupBy(tagsByType[tagType], (t) => String(filters.tags.includes(t.id)));
      tagsMap[tagType] = [...(grouped['true'] || []), ...(grouped['false'] || [])];
      numberSelectedByType[tagType] = grouped['true']?.length || 0;
    }
    return [tagsMap, numberSelectedByType];
  });
  let expandTags: Partial<Record<keyof typeof tagsByType, boolean>> = $state({});

  $effect(() => {
    for (const tagType of tagTypes) {
      if (!(tagType in expandTags)) {
        expandTags[tagType] = false;
      }
    }
  });

  let shortenedTagListByType = $derived.by(() => {
    const map: Partial<TagMap> = {};
    for (const tagType of tagTypes) {
      if (!tagsByTypeSelectedFirst[tagType]) {
        map[tagType] = [];
        continue;
      }
      map[tagType] = tagsByTypeSelectedFirst[tagType].slice(
        0,
        expandTags[tagType]
          ? undefined
          : Math.min(
              5 + (numberSelectedByType[tagType] || 0),
              tagsByTypeSelectedFirst[tagType].length
            )
      );
    }
    return map as TagMap;
  });

  let filterText = $derived.by(() => {
    const filterTypes = [];
    if (filters.tags.length !== 0) filterTypes.push('Tags');
    if (filters.status !== '') filterTypes.push('Status');
    if (filters.creator !== '') filterTypes.push('Creator');
    if (filters.bookmarked) filterTypes.push('Bookmark');

    return filterTypes.join(', ');
  });
</script>

<button
  class="select"
  popovertarget="popover-filter"
  style="anchor-name:--anchor-filter"
>
  Filter{filterText === '' ? '' : ':'}
  {filterText}
</button>
<div
  class="dropdown not-open:max-w-0 not-open:max-h-0 not-open:p-0 bg-base-200 p-4 rounded-xl flex flex-col gap-2"
  popover
  id="popover-filter"
  style="position-anchor:--anchor-filter"
>
  <h3 class="font-bold">By tag:</h3>
  <div class="flex flex-col gap-2">
    {#each tagTypes as tagType (tagType)}
      {#if tagsByTypeSelectedFirst[tagType]}
        <div class="flex flex-col gap-2">
          <button
            class="font-bold cursor-pointer text-left"
            onclick={() => (expandTags[tagType] = !expandTags[tagType])}
          >
            {tagType
              .split('_')
              .slice(1)
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ')
              .replaceAll('_', ' ')}
          </button>
          {#if tagsByTypeSelectedFirst[tagType].filter( (t) => filters.tags.includes(t.id) ).length > 0}
            <div class="flex flex-wrap gap-2 pt-1 border-t border-base-300 mt-1">
              {#each tagsByTypeSelectedFirst[tagType].filter( (t) => filters.tags.includes(t.id) ) as tag (tag.id)}
                <div animate:flip={{ duration: FLIP_DURATION }}>
                  <TagChip
                    {tag}
                    class="outline outline-accent"
                    href={() => {
                      filters.tags = filters.tags.filter((t) => t !== tag.id);
                    }}
                  />
                </div>
              {/each}
            </div>
          {/if}
          {#if shortenedTagListByType[tagType].length > 0}
            <div class="flex flex-row flex-wrap gap-2">
              {#each shortenedTagListByType[tagType] as tag (tag.id)}
                {#if !filters.tags.includes(tag.id)}
                  <div>
                    <TagChip
                      {tag}
                      class={filters.tags.includes(tag.id) ? 'outline outline-accent' : ''}
                      href={() => {
                        if (filters.tags.includes(tag.id))
                          filters.tags = filters.tags.filter((t) => t !== tag.id);
                        else filters.tags.push(tag.id);
                      }}
                    />
                  </div>
                {/if}
              {/each}
              {#if tagsByTypeSelectedFirst[tagType].length > 5}
                <TagChip
                  tag={{
                    id: '',
                    label: `Show ${expandTags[tagType] ? 'Less' : 'More'}`,
                    color: 'TAG_COLOR_BLUE',
                    order: 99,
                    type: tagsByType[tagType][0].type
                  }}
                  href={() => {
                    expandTags[tagType] = !expandTags[tagType];
                  }}
                />
              {/if}
            </div>
          {/if}
        </div>
      {/if}
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
        bind:group={filters.status}
      />
      <input
        class="join-item btn"
        type="radio"
        name="filter_status"
        aria-label="In Progress"
        value="in_progress"
        bind:group={filters.status}
      />
      <input
        class="join-item btn"
        type="radio"
        name="filter_status"
        aria-label="Complete"
        value="complete"
        bind:group={filters.status}
      />
    </div>
    <button
      class="btn btn-sm btn-ghost"
      onclick={() => (filters.status = '')}
    >
      <XIcon class="text-error w-6 h-6" />
    </button>
  </div>
  {#if user.type === 'student'}
    <h3 class="font-bold">By creator:</h3>
    <div class="flex flex-row items-center">
      <select
        class="select"
        bind:value={filters.creator}
      >
        <option
          value=""
          selected
          disabled>Pick a creator</option
        >
        {#each creators as creator (creator.id)}
          <option value={creator.id}>{creator.name}</option>
        {/each}
      </select>
      <button
        class="btn btn-sm btn-ghost"
        onclick={() => (filters.creator = '')}
      >
        <XIcon class="text-error w-6 h-6" />
      </button>
    </div>
  {/if}
  <h3 class="font-bold">Other Options:</h3>
  <div class="flex flex-row">
    <label class="label">
      <input
        class="checkbox checkbox-primary"
        type="checkbox"
        bind:checked={filters.bookmarked}
      />Bookmarked?
    </label>
  </div>
</div>
