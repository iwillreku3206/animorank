<script lang="ts">
  import { toggleValue } from './filterUtils';
  import ClickableBadge from '$lib/components/ui/badges/ClickableBadge.svelte';
  import SearchIcon from '@iconify-svelte/fa6-solid/magnifying-glass';

  // A tag-style multi-select panel for non-tag categories (status, creators).
  // Selected options render as solid chips; the rest as soft chips — the same
  // visual language as TagFilterPanel, but over plain {id,label} options.
  let {
    options,
    selected = $bindable(),
    searchable = false,
    searchPlaceholder = 'Filter',
    showMatchAll = false,
    matchAll = $bindable(false),
    matchAllLabel = 'Match all selected'
  }: {
    options: { id: string; label: string }[];
    selected: string[];
    searchable?: boolean;
    searchPlaceholder?: string;
    showMatchAll?: boolean;
    matchAll?: boolean;
    matchAllLabel?: string;
  } = $props();

  let query = $state('');
  const filtered = $derived(
    searchable && query.trim()
      ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
      : options
  );
</script>

<div class="flex flex-col gap-3">
  {#if searchable}
    <label class="input input-sm w-full">
      <SearchIcon class="h-[1em] opacity-50" />
      <input
        type="text"
        placeholder={searchPlaceholder}
        bind:value={query}
      />
    </label>
  {/if}

  <div class="flex flex-wrap gap-2 overflow-y-auto max-h-64 pr-1">
    {#each filtered as opt (opt.id)}
      <ClickableBadge
        class={selected.includes(opt.id) ? 'badge-primary' : 'badge-soft'}
        aria-pressed={selected.includes(opt.id)}
        onclick={() => (selected = toggleValue(selected, opt.id))}
      >
        {opt.label}
      </ClickableBadge>
    {:else}
      <p class="text-sm text-base-content/50">No options found.</p>
    {/each}
  </div>

  {#if showMatchAll}
    <label class="label cursor-pointer justify-start gap-2 text-sm">
      <input
        type="checkbox"
        class="checkbox checkbox-sm checkbox-primary"
        bind:checked={matchAll}
      />
      {matchAllLabel}
    </label>
  {/if}
</div>
