<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let props: HTMLButtonAttributes = $props();

  let { class: className, children, ...rest } = $derived(props);
</script>

<button
  class="btn shadow-none active:shadow-none font-medium rounded {className}"
  {...rest}>{@render children?.()}</button
>
<!-- <style>
  :global(.btn-outline:hover) {
    /* 1. Prevent text color inversion. It stays matching the outline color. */
    color: currentColor !important;

    /* 2. DYNAMIC BACKGROUND TINT (The shadcn/ui magic)
      Takes the button's exact current text color and mixes 10% of it 
      with 90% transparency. It adapts instantly to primary, success, error, etc.
    */
    background-color: color-mix(in srgb, currentColor 10%, transparent) !important;

    /* 3. DYNAMIC BORDER BRIGHTENING
      Slightly darkens or brightens the existing outline color on hover.
    */
    border-color: color-mix(in srgb, currentColor 80%, transparent) !important;
  }
</style> -->