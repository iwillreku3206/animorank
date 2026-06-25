<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import Badge from './Badge.svelte';

  type Props = HTMLAttributes<HTMLElement> & {
    /** When set, the badge renders as an anchor; otherwise as a button. */
    href?: string;
    class?: string;
    children?: Snippet;
  };

  let { href, class: className, children, ...rest }: Props = $props();

  const as = $derived<'a' | 'button'>(typeof href === 'string' ? 'a' : 'button');
</script>

<Badge
  {as}
  {href}
  class="cursor-pointer select-none {className}"
  {...rest}>{@render children?.()}</Badge
>

<style>
  :global(.badge.cursor-pointer:hover) {
    filter: brightness(0.9);
  }
</style>
