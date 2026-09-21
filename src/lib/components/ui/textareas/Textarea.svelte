<script
  module
  lang="ts"
>
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  // Shared prop type so callers (and any future wrapper) can inherit it verbatim.
  export type TextareaProps = HTMLTextareaAttributes & {
    /** Two-way bound value. `null` is accepted so callers can bind nullable
     * model fields directly, as a native `<textarea>` already tolerates. */
    value?: string | null;
    class?: string;
  };
</script>

<script lang="ts">
  // The single source of truth for textarea styling. Deliberately a bare
  // `<textarea>`: daisyUI's `.textarea` does carry a `& textarea` child rule, so
  // a `<label class="textarea">` wrapper with adornments would work the way
  // TextInput's does — but no caller wants one yet, so it's left out until one
  // exists. Same reasoning as Select.
  //
  // Note that `.textarea` already sets `min-height: 5rem`, which floors `rows`
  // for anything under ~4 lines. Callers wanting a taller field should pass a
  // height class (`min-h-32`, `flex-1`) rather than `rows`, which silently does
  // nothing at small values.
  let { value = $bindable(''), class: className, ...rest }: TextareaProps = $props();
</script>

<textarea
  bind:value
  class="textarea {className}"
  {...rest}
></textarea>
