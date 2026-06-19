<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = HTMLAttributes<HTMLElement> & {
    /** Which element to render. Defaults to a non-interactive span. */
    as?: 'span' | 'a' | 'button';
    /** Only applied when `as="a"`. */
    href?: string;
    /** Only applied when `as="button"`; defaults to "button". */
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    children?: Snippet;
  };

  let { as = 'span', href, type, class: className, children, ...rest }: Props = $props();
</script>

<svelte:element
  this={as}
  class="badge font-medium {className}"
  href={as === 'a' ? href : undefined}
  type={as === 'button' ? (type ?? 'button') : undefined}
  {...rest}>{@render children?.()}</svelte:element
>

<style>
  .badge-neutral {
    color: var(--color-neutral-content);
  }

  .badge-neutral.badge-outline {
    border-color: color-mix(in oklab, var(--color-neutral-content) 30%, transparent);
  }
</style>
