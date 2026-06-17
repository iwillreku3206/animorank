<script lang="ts">
  import type { Tag } from '$lib/zenstack/models';
  import type { Filters } from './api';
  import { STATUS_LABELS, STATUSES } from './api';
  import { selectionCount, hasAnyFilter, resetFilters } from './filterUtils';
  import TagFilterPanel from './TagFilterPanel.svelte';
  import SelectFilterPanel from './SelectFilterPanel.svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import XIcon from '@iconify-svelte/fa6-solid/xmark';

  let {
    filters = $bindable(),
    subjectTags,
    difficultyTags,
    topicTags,
    creators,
    showCreator = false
  }: {
    filters: Filters;
    subjectTags: Tag[];
    difficultyTags: Tag[];
    topicTags: Tag[];
    creators: { id: string; name: string }[];
    showCreator?: boolean;
  } = $props();

  type PanelId = 'subject' | 'difficulty' | 'topic' | 'status' | 'creator';
  let openPanel = $state<PanelId | null>(null);
  function toggle(p: PanelId) {
    openPanel = openPanel === p ? null : p;
  }

  const subjectCount = $derived(
    selectionCount(
      filters,
      subjectTags.map((t) => t.id)
    )
  );
  const difficultyCount = $derived(
    selectionCount(
      filters,
      difficultyTags.map((t) => t.id)
    )
  );
  const topicCount = $derived(
    selectionCount(
      filters,
      topicTags.map((t) => t.id)
    )
  );
  const statusCount = $derived(filters.statuses.length);
  const creatorCount = $derived(filters.creators.length);

  const statusOptions = STATUSES.map((s) => ({ id: s, label: STATUS_LABELS[s] }));
  const creatorOptions = $derived(creators.map((c) => ({ id: c.id, label: c.name })));

  function clearAll() {
    resetFilters(filters);
    openPanel = null;
  }
</script>

{#snippet categoryBtn(id: PanelId, label: string, count: number)}
  <Button
    class="btn-sm gap-1 {openPanel === id ? 'btn-primary' : 'btn-ghost'}"
    onclick={() => toggle(id)}
  >
    {label}
    {#if count > 0}
      <span class="badge badge-xs badge-neutral">{count}</span>
    {/if}
  </Button>
{/snippet}

<div class="flex flex-col gap-2">
  <div class="flex flex-wrap items-center gap-2">
    {@render categoryBtn('subject', 'Subject', subjectCount)}
    {@render categoryBtn('difficulty', 'Difficulty', difficultyCount)}
    {@render categoryBtn('topic', 'Topic', topicCount)}
    {@render categoryBtn('status', 'Status', statusCount)}
    {#if showCreator}
      {@render categoryBtn('creator', 'Creator', creatorCount)}
    {/if}
    <Button
      class="btn-sm {filters.bookmarked ? 'btn-primary' : 'btn-ghost'}"
      onclick={() => (filters.bookmarked = !filters.bookmarked)}
    >
      Bookmarked
    </Button>

    {#if hasAnyFilter(filters)}
      <Button
        class="btn-sm btn-ghost ms-auto"
        onclick={clearAll}
      >
        <XIcon class="w-3.5 h-3.5" /> Clear
      </Button>
    {/if}
  </div>

  {#if openPanel}
    <div class="bg-base-200 rounded-box p-4">
      {#if openPanel === 'subject'}
        <TagFilterPanel
          tags={subjectTags}
          bind:filters
        />
      {:else if openPanel === 'difficulty'}
        <TagFilterPanel
          tags={difficultyTags}
          bind:filters
        />
      {:else if openPanel === 'topic'}
        <TagFilterPanel
          tags={topicTags}
          bind:filters
          showMatchAll
          excludable
        />
      {:else if openPanel === 'status'}
        <SelectFilterPanel
          options={statusOptions}
          bind:selected={filters.statuses}
        />
      {:else if openPanel === 'creator'}
        <SelectFilterPanel
          options={creatorOptions}
          bind:selected={filters.creators}
          bind:matchAll={filters.creatorMatchAll}
          searchable
          searchPlaceholder="Search creators"
          showMatchAll
          matchAllLabel="Match all selected creators"
        />
      {/if}
    </div>
  {/if}
</div>
