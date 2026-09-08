<script lang="ts">
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

  // daisyUI dropdowns stay open while focus is inside them, so dismissing means
  // blurring. Called before `confirm()` so the menu isn't left open behind it.
  const closeMenu = () => (document.activeElement as HTMLElement | null)?.blur();
</script>

<div class="dropdown dropdown-end relative z-10 shrink-0">
  <button
    tabindex={0}
    class="btn btn-ghost btn-square btn-sm"
    aria-label="More actions for {title}"
  >
    <EllipsisVerticalIcon class="h-4 w-4" />
  </button>
  <div
    tabindex="-1"
    class="dropdown-content z-50 mt-2 w-56 rounded-box border border-base-content/10 bg-base-100 p-1.5 shadow-xl"
  >
    <ul class="flex flex-col gap-0.5">
      <li>
        <a
          class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors outline-none hover:bg-base-200 focus-visible:bg-base-200"
          href="/instructor/problemSets/{id}"
        >
          <PenIcon class="h-4 w-4 opacity-70" />
          Manage problem set
        </a>
      </li>
      <li>
        <button
          class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-error transition-colors outline-none hover:bg-base-200 focus-visible:bg-base-200"
          onclick={() => {
            closeMenu();
            if (window.confirm(`Delete "${title}"? This deletes its problems too and cannot be undone.`)) {
              onDelete();
            }
          }}
        >
          <TrashIcon class="h-4 w-4" />
          Delete problem set
        </button>
      </li>
    </ul>
  </div>
</div>
