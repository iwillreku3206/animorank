<script
  module
  lang="ts"
>
  import type { HTMLAttributes } from 'svelte/elements';

  // Shared prop type so callers (and any future wrapper) can inherit it verbatim.
  // Omit the native `title` attribute (a string tooltip) so it doesn't clash
  // with our `title` snippet in the intersection.
  export type AccordionProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
    titleText?: string;
    title?: import('svelte').Snippet;
    children?: import('svelte').Snippet;
    /**
     * Share one `name` across several accordions to make them an exclusive
     * group (radio inputs — only one open at a time). Omit it for an
     * independent panel that toggles on its own (checkbox).
     */
    name?: string;
    icon?: 'arrow' | 'plus' | 'none';
    open?: boolean;
    class?: string;
  };
</script>

<script lang="ts">
  let {
    titleText,
    title,
    children,
    name,
    icon = 'arrow',
    open = $bindable(false),
    class: className,
    ...rest
  }: AccordionProps = $props();

  // A shared `name` turns the panels into a radio group (exclusive); otherwise
  // a checkbox lets each panel toggle independently.
  const inputType = $derived(name != null ? 'radio' : 'checkbox');
  const iconClass = $derived(icon === 'arrow' ? 'collapse-arrow' : icon === 'plus' ? 'collapse-plus' : '');
</script>

<div
  class="collapse {iconClass} bg-base-300 border border-base-100 rounded {className}"
  {...rest}
>
  {#if inputType === 'radio'}
    <input
      type="radio"
      {name}
      checked={open}
    />
  {:else}
    <input
      type="checkbox"
      bind:checked={open}
    />
  {/if}
  <div class="collapse-title font-medium">
    {#if title}{@render title()}{:else}{titleText}{/if}
  </div>
  <div class="collapse-content text-sm text-base-content/70">
    {@render children?.()}
  </div>
</div>

<style>
  /* Match the button's easing curve so the height + arrow motion feels like the
     rest of the app. daisyUI's default collapse transition is a touch abrupt. */
  .collapse,
  .collapse :global(.collapse-content) {
    transition-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
    transition-duration: 250ms;
  }

  /* daisyUI rotates the arrow/plus indicator; give it the same easing. */
  .collapse :global(.collapse-title:after) {
    transition: transform 250ms cubic-bezier(0.22, 0.61, 0.36, 1);
  }
</style>
