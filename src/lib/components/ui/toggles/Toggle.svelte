<script
  module
  lang="ts"
>
  import type { HTMLInputAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  // daisyUI's toggle is a checkbox wearing a different coat — same element, same
  // `checked`, so this mirrors Checkbox rather than inventing a second shape.
  // `type` is omitted because it is fixed here.
  export type ToggleProps = Omit<HTMLInputAttributes, 'type'> & {
    /**
     * Text beside the control. Passing it wraps the toggle in a `<label>` so the
     * text joins the click target; omit it for a bare control named by
     * `aria-label` — which is what the editor settings rows need, since they put
     * the name in a separate column from the control.
     */
    children?: Snippet;
    /** daisyUI modifiers for the control — always the control, labelled or not. */
    class?: string;
    /** Classes for the `<label>` wrapper. Ignored when there are no children. */
    labelClass?: string;
  };
</script>

<script lang="ts">
  let { checked = $bindable(false), children, class: className, labelClass, ...rest }: ToggleProps = $props();
</script>

{#if children}
  <label class="label cursor-pointer justify-start gap-3 {labelClass}">
    <input
      type="checkbox"
      bind:checked
      class="toggle {className}"
      {...rest}
    />
    {@render children()}
  </label>
{:else}
  <input
    type="checkbox"
    bind:checked
    class="toggle {className}"
    {...rest}
  />
{/if}
