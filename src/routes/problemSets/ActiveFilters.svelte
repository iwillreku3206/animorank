<script lang="ts">
  import type { Tag } from '$lib/zenstack/models';
  import type { Filters, Status } from './api';
  import { STATUS_LABELS, STATUSES } from './api';
  import { removeTag, toggleValue, cloneFilters } from './filterUtils';
  import { arrayToHashMap } from '$lib/utils/arrayToHashMap';
  import ClickableBadge from '$lib/components/ui/badges/ClickableBadge.svelte';
  import XIcon from '@iconify-svelte/fa6-solid/xmark';

  let {
    filters,
    onChange,
    allTags,
    creators = []
  }: {
    filters: Filters;
    /** Emit the next filter state; the parent reflects it into the URL. */
    onChange: (_next: Filters) => void;
    allTags: Tag[];
    creators?: { id: string; name: string }[];
  } = $props();

  /** Apply a mutation to a draft copy and emit it (filters itself is read-only). */
  function edit(fn: (_draft: Filters) => void) {
    const draft = cloneFilters(filters);
    fn(draft);
    onChange(draft);
  }

  const byId = $derived(arrayToHashMap(allTags, (t) => t.id));

  const TYPE_LABEL: Record<string, string> = {
    SubjectTag: 'Subject',
    DifficultyTag: 'Difficulty',
    TopicTag: 'Topic'
  };
  // Display order across categories, then by the tag's own `order` within a category.
  const TYPE_RANK: Record<string, number> = {
    SubjectTag: 0,
    DifficultyTag: 1,
    TopicTag: 2
  };

  // One normalized chip per active filter, so the markup is a single loop
  // regardless of the underlying source (tag / status / creator / bookmark).
  type Chip = {
    key: string;
    /** Category prefix shown in muted text; empty for chips that need none. */
    category: string;
    value: string;
    exclude?: boolean;
    remove: () => void;
  };

  // Tags: included then excluded, sorted across categories then by intra-category order.
  const activeTags = $derived(
    [
      ...filters.include
        .filter((id) => byId[id])
        .map((id) => ({ id, tag: byId[id], state: 'include' as const })),
      ...filters.exclude
        .filter((id) => byId[id])
        .map((id) => ({ id, tag: byId[id], state: 'exclude' as const }))
    ].sort((a, b) => {
      const rank = (TYPE_RANK[a.tag.type] ?? 99) - (TYPE_RANK[b.tag.type] ?? 99);
      return rank !== 0 ? rank : (a.tag.order ?? 0) - (b.tag.order ?? 0);
    })
  );

  const chips = $derived<Chip[]>([
    ...activeTags.map(({ id, tag, state }) => ({
      key: `tag:${id}`,
      category: TYPE_LABEL[tag.type] ?? '',
      value: tag.label,
      exclude: state === 'exclude',
      remove: () => edit((f) => removeTag(f, id))
    })),

    // Statuses in canonical order; creators in the (alphabetical) load order.
    ...STATUSES.filter((s) => filters.statuses.includes(s)).map((status) => ({
      key: `status:${status}`,
      category: 'Status',
      value: STATUS_LABELS[status],
      remove: () => edit((f) => (f.statuses = toggleValue(f.statuses, status) as Status[]))
    })),

    ...creators
      .filter((c) => filters.creators.includes(c.id))
      .map((creator) => ({
        key: `creator:${creator.id}`,
        category: 'Creator',
        value: creator.name,
        remove: () => edit((f) => (f.creators = toggleValue(f.creators, creator.id)))
      })),

    ...(filters.bookmarked
      ? [
          {
            key: 'bookmarked',
            category: '',
            value: 'Bookmarked',
            remove: () => edit((f) => (f.bookmarked = false))
          }
        ]
      : [])
  ]);
</script>

{#if chips.length > 0}
  <div class="flex flex-wrap gap-2">
    {#each chips as { key, category, value, exclude, remove } (key)}
      <ClickableBadge
        class="gap-1 badge-soft badge-outline {exclude ? 'badge-error' : 'badge-neutral'}"
        aria-label="Remove {value} filter"
        onclick={remove}
      >
        {#if exclude}<span class="opacity-70">Exclude </span>{/if}
        {#if category}<span class="opacity-70">{category}:</span>{/if}
        <span>{value}</span>
        <XIcon class="w-3 h-3 opacity-70" />
      </ClickableBadge>
    {/each}
  </div>
{/if}
