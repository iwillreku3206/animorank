<script lang="ts">
  import type { Tag } from '$lib/zenstack/models';
  import type { Filters } from './api';
  import { tagState, cycleTag, toggleInclude } from './filterUtils';
  import TagChip from '$lib/components/ui/TagChip.svelte';
  import SearchIcon from '@iconify-svelte/fa6-solid/magnifying-glass';

  let {
    tags,
    filters = $bindable(),
    showMatchAll = false,
    excludable = false
  }: { tags: Tag[]; filters: Filters; showMatchAll?: boolean; excludable?: boolean } = $props();

  let query = $state('');
  const filtered = $derived(
    query.trim()
      ? tags.filter((t) => t.label.toLowerCase().includes(query.trim().toLowerCase()))
      : tags
  );

  // Base variant color comes from the tag itself (TagChip); state is overlaid:
  // include = solid, exclude = outlined + struck through, none = soft.
  function chipClass(id: string): string {
    const state = tagState(filters, id);
    if (state === 'include') return '';
    if (state === 'exclude') return 'badge-outline line-through opacity-70';
    return 'badge-soft';
  }

  // Topics cycle through include/exclude; single-valued categories just toggle.
  const onChipClick = (id: string) =>
    excludable ? cycleTag(filters, id) : toggleInclude(filters, id);
</script>

<div class="flex flex-col gap-3">
  <label class="input input-sm w-full">
    <SearchIcon class="h-[1em] opacity-50" />
    <input
      type="text"
      placeholder="Filter tags"
      bind:value={query}
    />
  </label>

  {#if excludable}
    <p class="text-xs text-base-content/60">
      Cycle: <span class="font-medium">include → exclude → clear</span>
    </p>
  {/if}

  <div class="flex flex-wrap gap-2 overflow-y-auto max-h-64 pr-1">
    {#each filtered as tag (tag.id)}
      <TagChip
        {tag}
        class={chipClass(tag.id)}
        onclick={() => onChipClick(tag.id)}
      />
    {:else}
      <p class="text-sm text-base-content/50">No tags found.</p>
    {/each}
  </div>

  {#if showMatchAll}
    <label class="label cursor-pointer justify-start gap-2 text-sm">
      <input
        type="checkbox"
        class="checkbox checkbox-sm checkbox-primary"
        bind:checked={filters.topicMatchAll}
      />
      Match all selected tags
    </label>
  {/if}
</div>
