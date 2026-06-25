<script lang="ts">
  import type { Tag } from '$lib/zenstack/models';
  import type { Filters } from './api';
  import { tagState, cycleTag, toggleInclude, cloneFilters } from './filterUtils';
  import TagChip from '$lib/components/ui/TagChip.svelte';
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import SearchIcon from '@iconify-svelte/fa6-solid/magnifying-glass';

  let {
    tags,
    filters,
    onChange,
    showMatchAll = false,
    excludable = false
  }: {
    tags: Tag[];
    filters: Filters;
    /** Emit the next filter state; the parent reflects it into the URL. */
    onChange: (_next: Filters) => void;
    showMatchAll?: boolean;
    excludable?: boolean;
  } = $props();

  /** Apply a mutation to a draft copy and emit it (filters itself is read-only). */
  function edit(fn: (_draft: Filters) => void) {
    const draft = cloneFilters(filters);
    fn(draft);
    onChange(draft);
  }

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
    if (state === 'exclude') return 'badge-outline opacity-70';
    return 'badge-soft';
  }

  // Topics cycle through include/exclude; single-valued categories just toggle.
  const onChipClick = (id: string) =>
    edit((f) => (excludable ? cycleTag(f, id) : toggleInclude(f, id)));
</script>

<div class="flex flex-col gap-3">
  <TextInput
    class="input-sm w-full"
    type="text"
    placeholder="Filter tags"
    bind:value={query}
  >
    {#snippet leading()}
      <SearchIcon />
    {/snippet}
  </TextInput>

  {#if excludable}
    <p class="text-xs text-base-content/60">
      Cycle: <span class="font-medium">
        <span class="text-success">include</span> → <span class="text-error">exclude</span> → clear
      </span>
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
        checked={filters.topicMatchAll}
        onchange={(e) => edit((f) => (f.topicMatchAll = e.currentTarget.checked))}
      />
      Match all selected tags
    </label>
  {/if}
</div>
