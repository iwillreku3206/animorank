<script
  module
  lang="ts"
>
  import type { Snippet } from 'svelte';

  export type DropdownProps = {
    /**
     * The trigger element. Receives bits-ui's props — spread them onto whatever
     * you render (usually a `Button`) so it gets the id, `aria-haspopup`,
     * `aria-expanded` and event wiring:
     *
     * ```svelte
     * {#snippet trigger(props)}
     *   <Button {...props} class="btn-ghost btn-square">…</Button>
     * {/snippet}
     * ```
     */
    trigger: Snippet<[Record<string, unknown>]>;
    /** The menu contents — normally `DropdownItem`s and `DropdownSeparator`s. */
    children: Snippet;
    /** Two-way bindable open state, for callers that need to drive it. */
    open?: boolean;
    /** Which edge of the trigger the panel sits on. */
    side?: 'top' | 'right' | 'bottom' | 'left';
    /** How the panel lines up along that edge. */
    align?: 'start' | 'center' | 'end';
    /** Gap between trigger and panel, in px. */
    sideOffset?: number;
    /** Accessible name for the menu itself. */
    label?: string;
    /** Classes for the panel — width overrides live here. */
    class?: string;
  };
</script>

<script lang="ts">
  // Built on bits-ui rather than daisyUI's `.dropdown`. daisyUI's is CSS-only:
  // it stays open while focus is inside, so dismissing means calling `blur()`,
  // it can't be positioned outside a clipping/scrolling ancestor, and it has no
  // menu semantics. bits-ui gives real open state, Escape and click-away,
  // focus return, `role="menu"` with arrow-key navigation, and Floating-UI
  // positioning through a portal — which is what AccountMenu had to hand-roll.
  import { DropdownMenu } from 'bits-ui';

  let {
    trigger,
    children,
    open = $bindable(false),
    side = 'bottom',
    align = 'end',
    sideOffset = 8,
    label,
    class: className
  }: DropdownProps = $props();
</script>

<DropdownMenu.Root bind:open>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      {@render trigger(props)}
    {/snippet}
  </DropdownMenu.Trigger>

  <DropdownMenu.Portal>
    <DropdownMenu.Content
      {side}
      {align}
      {sideOffset}
      aria-label={label}
      class="z-50 w-56 rounded-box border border-base-content/10 bg-base-100 p-1.5 shadow-xl
             origin-(--bits-floating-transform-origin)
             transition data-[state=closed]:scale-95 data-[state=closed]:opacity-0
             data-[state=open]:scale-100 data-[state=open]:opacity-100
             motion-reduce:transition-none {className}"
    >
      {@render children()}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
