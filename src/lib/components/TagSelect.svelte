<script lang="ts">
  import { arrayToHashMap } from '$lib/utils/arrayToHashMap';
  import type { Tag } from '$lib/zenstack/models';
  import TagChip from './TagChip.svelte';

  let { tags, selectedTagId = $bindable() }: { tags: Tag[]; selectedTagId: string | null } =
    $props();

  let tagMap = $derived(arrayToHashMap(tags, (tag) => tag.id));
</script>

<div class="dropdown w-full">
  <div
    tabindex="0"
    role="button"
    class="select select-primary w-full"
  >
    {#if selectedTagId}
      <TagChip tag={tagMap[selectedTagId]} />
    {:else}
      Select a subject
    {/if}
  </div>
  <ul
    tabindex="-1"
    class="dropdown-content menu bg-base-100 rounded-box p-2 shadow-sm gap-2"
  >
    {#each tags as tag (tag.id)}
      <li>
        <button
          class="list-item w-full"
          onclick={() => {
            selectedTagId = tag.id;
            (document.activeElement as HTMLButtonElement)?.blur();
          }}
        >
          <TagChip {tag} />
        </button>
      </li>
    {/each}
  </ul>
</div>
