<script
  module
  lang="ts"
>
  import type { HTMLInputAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  // Shared prop type so callers (and any future wrapper) can inherit it verbatim.
  export type TextInputProps = HTMLInputAttributes & {
    /** Two-way bound value. */
    value?: string | number;
    /** Content rendered before the field — typically a leading icon. */
    leading?: Snippet;
    /** Content rendered after the field — a trailing icon, kbd hint, etc. */
    trailing?: Snippet;
    class?: string;
  };
</script>

<script lang="ts">
  // The single source of truth for text-input styling. A bare `<input class="input">`
  // when there are no adornments; daisyUI's `<label class="input">` wrapper when a
  // `leading`/`trailing` snippet is given (so the icon sits inside the field and
  // shares its focus ring).
  let {
    value = $bindable(''),
    leading,
    trailing,
    type = 'text',
    class: className,
    ...rest
  }: TextInputProps = $props();

  const wrapped = $derived(leading != null || trailing != null);
</script>

{#if wrapped}
  <label class="input {className}">
    {@render leading?.()}
    <!-- The `.input` styling lives on the <label>; the inner field is bare. -->
    <input
      {type}
      bind:value
      {...rest}
    />
    {@render trailing?.()}
  </label>
{:else}
  <input
    {type}
    bind:value
    class="input {className}"
    {...rest}
  />
{/if}

<style>
  /* daisyUI doesn't dim a leading/trailing adornment on its own. Soften any
     SVG inside the wrapper so icons read as secondary to the typed value,
     matching how the existing search fields style their icons. */
  label.input :global(svg) {
    height: 1em;
    opacity: 0.5;
  }
</style>
