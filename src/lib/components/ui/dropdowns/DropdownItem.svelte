<script
  module
  lang="ts"
>
  import type { Snippet } from 'svelte';

  export type DropdownItemProps = {
    /** Render as a link. Without it the item is a button. */
    href?: string;
    /** Runs when the item is chosen — by click or by Enter/Space. */
    onSelect?: () => void;
    disabled?: boolean;
    /** `danger` tints the row for destructive actions. */
    variant?: 'default' | 'danger';
    /** Keep the menu open after selecting — for toggles and the like. */
    closeOnSelect?: boolean;
    children: Snippet;
    class?: string;
  };
</script>

<script lang="ts">
  import { DropdownMenu } from 'bits-ui';

  let {
    href,
    onSelect,
    disabled = false,
    variant = 'default',
    closeOnSelect = true,
    children,
    class: className
  }: DropdownItemProps = $props();
</script>

<DropdownMenu.Item
  {disabled}
  {closeOnSelect}
  onSelect={() => onSelect?.()}
>
  <!-- `child` lets the row be a real <a> or <button> rather than bits-ui's
       default <div>, so links keep middle-click, "open in new tab" and the
       browser's own status-bar preview. -->
  {#snippet child({ props })}
    {#if href}
      <a
        {...props}
        {href}
        class="item {variant === 'danger' ? 'item-danger' : ''} {className}">{@render children()}</a
      >
    {:else}
      <button
        {...props}
        type="button"
        class="item {variant === 'danger' ? 'item-danger' : ''} {className}">{@render children()}</button
      >
    {/if}
  {/snippet}
</DropdownMenu.Item>

<style>
  /* One definition of a menu row, replacing the utility string that was copied
     across the action menus and the hand-rolled `.item` rule in AccountMenu. */
  .item {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 0.75rem;
    border-radius: var(--radius-field, 0.5rem);
    padding: 0.5rem 0.75rem;
    text-align: left;
    font-size: 0.875rem;
    color: var(--color-base-content);
    outline: none;
    cursor: pointer;
    transition:
      background-color 150ms ease,
      color 150ms ease;
  }

  /* bits-ui sets `data-highlighted` on the active row for both pointer and
     keyboard, so one rule covers hover and arrow-key navigation — the old
     `:hover`-only styling left keyboard users with no visible focus. */
  .item[data-highlighted] {
    background-color: color-mix(in oklab, var(--color-base-content) 8%, transparent);
  }

  .item-danger {
    color: var(--color-error);
  }

  .item-danger[data-highlighted] {
    background-color: color-mix(in oklab, var(--color-error) 12%, transparent);
    color: var(--color-error);
  }

  .item[data-disabled] {
    opacity: 0.5;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .item {
      transition: none;
    }
  }
</style>
