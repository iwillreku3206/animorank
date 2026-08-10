<script
  module
  lang="ts"
>
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

  // Shared prop type so ButtonLink can inherit it verbatim. Omit the anchor's
  // `type` (a MIME hint) so it doesn't clash with the button's `type`
  // ("submit" | "reset" | "button") in the intersection. `ref` exposes the
  // underlying DOM node (`bind:ref`) for callers that need it — e.g. focus
  // management — since `bind:this` on a component yields the instance, not the
  // element.
  export type ButtonProps = HTMLButtonAttributes & Omit<HTMLAnchorAttributes, 'type'> & { ref?: HTMLElement | null };
</script>

<script lang="ts">
  // Polymorphic: renders an <a> when `href` is set, otherwise a <button>. This
  // is the single source of truth for button styling — ButtonLink delegates here.
  let { class: className, children, href, ref = $bindable(null), ...rest }: ButtonProps = $props();
</script>

<svelte:element
  this={href != null ? 'a' : 'button'}
  bind:this={ref}
  {href}
  class="btn shadow-none font-medium rounded {className}"
  {...rest}>{@render children?.()}</svelte:element
>

<style>
  .btn {
    transition-property: color, background-color, border-color, scale;
    transition-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
    transition-duration: 250ms;
  }

  @media (hover: hover) {
    .btn:hover {
      --btn-bg: color-mix(in oklab, var(--btn-color, var(--color-base-200)), #000 14%);
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    .btn:active:not(.btn-disabled, :disabled, [disabled]) {
      --btn-bg: color-mix(in oklab, var(--btn-color, var(--color-base-200)), #000 20%);
    }
  }

  .btn-neutral {
    color: color-mix(in srgb, var(--color-neutral-content) 70%, transparent);
  }
  .btn-neutral:hover {
    color: var(--color-neutral-content);
  }
</style>
