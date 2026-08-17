<script lang="ts">
  import { arrayToHashMap } from '$lib/utils/arrayToHashMap';
  import type { Tag } from '$lib/zenstack/models';
  import TagChip from './TagChip.svelte';

  let {
    tags,
    selectedTagId = $bindable(),
    placeholder = 'Select…'
  }: {
    tags: Tag[];
    selectedTagId: string | null;
    placeholder?: string;
  } = $props();

  const tagById = $derived(arrayToHashMap(tags, (tag) => tag.id));
  const selectedTag = $derived(selectedTagId ? tagById[selectedTagId] : null);

  function select(id: string) {
    selectedTagId = id;
    (document.activeElement as HTMLElement | null)?.blur();
  }
</script>

<div class="dropdown w-full">
  <div
    tabindex="0"
    role="button"
    class="select select-xs select-primary w-full items-center"
  >
    {#if selectedTag}
      <TagChip tag={selectedTag} />
    {:else}
      <span class="text-base-content/50">{placeholder}</span>
    {/if}
  </div>
  <ul
    tabindex="-1"
    class="dropdown-content menu bg-base-100 rounded-box z-10 mt-1 w-full p-2 shadow-sm gap-1"
  >
    {#each tags as tag (tag.id)}
      <li>
        <button
          type="button"
          class="flex w-full"
          onclick={() => select(tag.id)}
        >
          <TagChip {tag} />
        </button>
      </li>
    {/each}
  </ul>
</div>
