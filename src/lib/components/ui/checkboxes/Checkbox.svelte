<script
  module
  lang="ts"
>
  import type { HTMLInputAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  // Shared prop type so callers (and any future wrapper) can inherit it verbatim.
  // `type` is omitted because it is fixed here — a radio is its own component.
  //
  // `checked` is deliberately left to `HTMLInputAttributes`, which types it as
  // `boolean | undefined | null`, matching a native checkbox. Narrowing it to
  // `boolean` would reject callers binding a nullable model field.
  export type CheckboxProps = Omit<HTMLInputAttributes, 'type'> & {
    /**
     * Text beside the control. Passing it wraps the checkbox in a `<label>` so
     * the text joins the click target — the shape six call sites were each
     * rebuilding by hand, which is how their wrappers drifted across three
     * different gaps. Omit it for a bare control: a checkbox named only by
     * `aria-label`, or one whose caller supplies its own label (the selectable
     * ToS cards and the delete-account confirm are their own design, not this).
     */
    children?: Snippet;
    /** daisyUI modifiers for the control — always the control, labelled or not. */
    class?: string;
    /** Classes for the `<label>` wrapper. Ignored when there are no children. */
    labelClass?: string;
  };
</script>

<script lang="ts">
  // The single source of truth for checkbox styling. Follows TextInput: one
  // component, and the root element changes depending on whether the caller
  // passed the extra content. Unlike TextInput, `class` does not retarget with
  // it — `checkbox-sm` belongs to the control in either shape.
  let { checked = $bindable(false), children, class: className, labelClass, ...rest }: CheckboxProps = $props();
</script>

{#if children}
  <label class="label cursor-pointer justify-start gap-3 {labelClass}">
    <input
      type="checkbox"
      bind:checked
      class="checkbox shadow-none {className}"
      {...rest}
    />
    {@render children()}
  </label>
{:else}
  <input
    type="checkbox"
    bind:checked
    class="checkbox shadow-none {className}"
    {...rest}
  />
{/if}
