<script lang="ts">
  import Checkbox from '$lib/components/ui/checkboxes/Checkbox.svelte';
  import { toggleValue } from './filterUtils';
  import ClickableBadge from '$lib/components/ui/badges/ClickableBadge.svelte';
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import SearchIcon from '@iconify-svelte/fa6-solid/magnifying-glass';

  // A tag-style multi-select panel for non-tag categories (status, creators).
  // Selected options render as solid chips; the rest as soft chips — the same
  // visual language as TagFilterPanel, but over plain {id,label} options.
  let {
    options,
    selected,
    onSelectedChange,
    searchable = false,
    searchPlaceholder = 'Filter',
    showMatchAll = false,
    matchAll = false,
    onMatchAllChange,
    matchAllLabel = 'Match all selected'
  }: {
    options: { id: string; label: string }[];
    selected: string[];
    /** Emit the next selection; the parent owns the underlying state. */
    onSelectedChange: (__next: string[]) => void;
    searchable?: boolean;
    searchPlaceholder?: string;
    showMatchAll?: boolean;
    matchAll?: boolean;
    onMatchAllChange?: (_next: boolean) => void;
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
    <TextInput
      class="input-sm w-full"
      type="text"
      placeholder={searchPlaceholder}
      bind:value={query}
    >
      {#snippet leading()}
        <SearchIcon />
      {/snippet}
    </TextInput>
  {/if}

  <div class="flex flex-wrap gap-2 overflow-y-auto max-h-64 pr-1">
    {#each filtered as opt (opt.id)}
      <ClickableBadge
        class={selected.includes(opt.id) ? 'badge-primary' : 'badge-soft'}
        aria-pressed={selected.includes(opt.id)}
        onclick={() => onSelectedChange(toggleValue(selected, opt.id))}
      >
        {opt.label}
      </ClickableBadge>
    {:else}
      <p class="text-sm text-base-content/50">No options found.</p>
    {/each}
  </div>

  {#if showMatchAll}
    <Checkbox
      class="checkbox-sm checkbox-primary"
      labelClass="text-sm"
      checked={matchAll}
      onchange={(e) => onMatchAllChange?.(e.currentTarget.checked)}>{matchAllLabel}</Checkbox
    >
  {/if}
</div>
