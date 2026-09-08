<script
  module
  lang="ts"
>
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  // Shared prop type so callers (and any future wrapper) can inherit it verbatim.
  //
  // `value` is deliberately left to `HTMLSelectAttributes`, which types it as
  // `any` — the same type a native `<select>` binding has. Narrowing it here
  // would reject callers that bind a union (`'on' | 'off' | 'relative'`), a
  // nullable model id, or an arbitrary JSON form value, all of which occur.
  export type SelectProps = HTMLSelectAttributes & {
    /** The `<option>` / `<optgroup>` list. */
    children?: Snippet;
    class?: string;
  };
</script>

<script lang="ts">
  // The single source of truth for select styling. Deliberately a bare
  // `<select>`: the `<label class="select">` wrapper daisyUI offers for leading
  // icons has no caller yet, so it's left out until one exists.
  let { value = $bindable(null), children, class: className, ...rest }: SelectProps = $props();
</script>

<select
  bind:value
  class="select shadow-none {className}"
  {...rest}>{@render children?.()}</select
>

<style>
  .select:focus,
  .select:focus-within {
    outline: none;
  }

  /* Chromium 135+ only: the dropdown panel is OS-drawn and unstyleable until
   * `appearance: base-select` swaps in a real DOM picker. Both the select and
   * the picker have to opt in. Firefox/Safari skip this and keep the native
   * popup. Global because `.select` is also used directly at the call sites
   * that have not migrated to this component yet. */
  :global {
    @supports (appearance: base-select) {
      .select,
      .select::picker(select) {
        appearance: base-select;
      }

      .select::picker(select) {
        border: 1px solid var(--color-base-100);
        background: var(--color-base-200);
      }
    }
  }
</style>
