<script
  module
  lang="ts"
>
  import type { ChangeEventHandler, HTMLInputAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  // `type` is omitted because it is fixed here.
  export type RadioProps = Omit<HTMLInputAttributes, 'type'> & {
    /** The value this radio contributes to its group. */
    value?: unknown;
    /**
     * The group's selected value — `bind:group` it from the caller. Named
     * `group` rather than `checked` to read like Svelte's own `bind:group`,
     * which cannot be used here: Svelte only groups radios compiled into the
     * same component, so a radio behind a component boundary has to compare
     * against the selected value itself.
     */
    group?: unknown;
    /**
     * Text beside the control. Passing it wraps the radio in a `<label>` so the
     * text joins the click target; omit it for a bare control. Radios are
     * near-always labelled — each option needs its own visible name.
     */
    children?: Snippet;
    /** daisyUI modifiers for the control — always the control, labelled or not. */
    class?: string;
    /** Classes for the `<label>` wrapper. Ignored when there are no children. */
    labelClass?: string;
  };
</script>

<script lang="ts">
  let { value, group = $bindable(), onchange, children, class: className, labelClass, ...rest }: RadioProps = $props();

  // Selecting drives the group; the caller's own onchange still runs after, so
  // `onchange` stays usable for side effects rather than being swallowed here.
  const select: ChangeEventHandler<HTMLInputElement> = (event) => {
    group = value;
    onchange?.(event);
  };
</script>

{#if children}
  <label class="label cursor-pointer justify-start gap-3 {labelClass}">
    <input
      type="radio"
      {value}
      checked={group === value}
      onchange={select}
      class="radio {className}"
      {...rest}
    />
    {@render children()}
  </label>
{:else}
  <input
    type="radio"
    {value}
    checked={group === value}
    onchange={select}
    class="radio {className}"
    {...rest}
  />
{/if}
