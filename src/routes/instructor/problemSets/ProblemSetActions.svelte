<script lang="ts">
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import Dropdown from '$lib/components/ui/dropdowns/Dropdown.svelte';
  import DropdownItem from '$lib/components/ui/dropdowns/DropdownItem.svelte';
  import EllipsisVerticalIcon from '@iconify-svelte/fa6-solid/ellipsis-vertical';
  import PenIcon from '@iconify-svelte/fa6-solid/pen-to-square';
  import TrashIcon from '@iconify-svelte/fa6-solid/trash-can';

  // Shared by the card and the list item so the menu isn't written twice; both
  // present the same two actions.
  let {
    id,
    title,
    onDelete
  }: {
    id: string;
    title: string;
    onDelete: () => void;
  } = $props();

  function confirmDelete() {
    // `confirm()` blocks paint, so defer a tick and let the menu finish closing
    // first — otherwise the dialog appears over a menu still on screen.
    setTimeout(() => {
      if (window.confirm(`Delete "${title}"? This deletes its problems too and cannot be undone.`)) {
        onDelete();
      }
    }, 0);
  }
</script>

<Dropdown
  label="Actions for {title}"
  class="w-56"
>
  {#snippet trigger(props)}
    <Button
      {...props}
      class="btn-ghost btn-square btn-sm relative z-10 shrink-0"
      aria-label="More actions for {title}"
    >
      <EllipsisVerticalIcon class="h-4 w-4" />
    </Button>
  {/snippet}

  <DropdownItem href="/instructor/problemSets/{id}">
    <PenIcon class="h-4 w-4 opacity-70" />
    Manage problem set
  </DropdownItem>
  <DropdownItem
    variant="danger"
    onSelect={confirmDelete}
  >
    <TrashIcon class="h-4 w-4" />
    Delete problem set
  </DropdownItem>
</Dropdown>
