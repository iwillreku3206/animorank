<script lang="ts">
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  let props: HTMLAnchorAttributes = $props();
  let { class: className, children, ...rest } = $derived(props);
</script>

<a
  class="link {className}"
  {...rest}>{@render children?.()}</a
>

<style>
  .link {
    transition: color, background-color, border-color;
    transition-duration: 250ms;
    transition-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  @media (hover: hover) {
    .link:hover {
      --link-color: color-mix(in oklab, var(--color-primary) 70%, transparent);
    }
  }

  .link:active:not(.link-disabled, :disabled, [disabled]) {
    --link-color: color-mix(in oklab, var(--color-primary) 50%, transparent);
  }

  /* — link-hover — */

  .link-hover {
    position: relative;
    text-decoration: none;
  }

  .link-hover::after {
    content: '';
    position: absolute;
    inset-inline: 0;
    bottom: -1px;
    height: 1px;
    background-color: currentColor;
    transform: scaleX(0);
    transform-origin: 100% 50%;
    transition: transform 180ms cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  @media (hover: hover) {
    .link-hover:hover::after {
      transform: scaleX(1);
      transform-origin: 0 50%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .link-hover::after {
      transition: none;
    }
  }

  /* — link-neutral — */

  .link-neutral {
    color: color-mix(in srgb, var(--color-neutral-content) 70%, transparent);
  }

  .link-neutral:hover {
    color: var(--color-neutral-content);
  }

  .link {
    text-decoration: none;
  }
</style>
