<script lang="ts">
  import type { User } from '@auth/sveltekit';
  import { signOut } from '@auth/sveltekit/client';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import ContractIcon from '@iconify-svelte/fa6-solid/file-contract';
  import LogoutIcon from '@iconify-svelte/fa6-solid/arrow-right-from-bracket';

  let { user, compact = false }: { user: User; compact?: boolean } = $props();

  let open = $state(false);
  let triggerEl = $state<HTMLElement | null>(null);
  let panelEl = $state<HTMLDivElement>();
  // Pin the panel under the trigger, right-aligned to it.
  let pos = $state({ top: 0, right: 0 });

  function place() {
    const r = triggerEl?.getBoundingClientRect();
    if (!r) return;
    pos = { top: r.bottom + 8, right: window.innerWidth - r.right };
  }

  function toggle() {
    open = !open;
    if (open) place();
  }

  function close(returnFocus = false) {
    open = false;
    if (returnFocus) triggerEl?.focus();
  }

  // While open, keep the panel pinned to the (sticky) trigger and wire global
  // dismissals. Move focus into the panel so keyboard + SR users land in-menu.
  $effect(() => {
    if (!open) return;
    place();
    panelEl?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true);
    };
    const reposition = () => place();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  });

  function logout() {
    close();
    signOut();
  }
</script>

<Button
  bind:ref={triggerEl}
  type="button"
  class="btn-ghost btn-circle grid place-items-center overflow-hidden {compact ? 'btn-sm' : ''}"
  onclick={toggle}
  aria-haspopup="menu"
  aria-expanded={open}
  aria-label="Account menu"
>
  <img
    src={user.image}
    alt=""
    class="rounded-full object-cover {compact ? 'h-7 w-7' : 'h-10 w-10'}"
  />
</Button>

<!-- Transparent click-away layer; stays in the DOM so the panel can animate out. -->
<button
  type="button"
  class="fixed inset-0 z-40 cursor-default"
  class:pointer-events-none={!open}
  tabindex="-1"
  aria-hidden="true"
  onclick={() => close()}
></button>

<div
  bind:this={panelEl}
  class="menu-anim fixed z-50 w-64 max-w-[calc(100vw-1rem)] origin-top-right overflow-hidden rounded-box border border-base-content/10 bg-base-200 shadow-xl"
  class:is-open={open}
  style="top: {pos.top}px; right: {pos.right}px"
  inert={!open}
  tabindex="-1"
  aria-label="Account"
>
  <!-- Identity -->
  <div class="flex items-center gap-3 px-4 py-3">
    <img
      src={user.image}
      alt=""
      class="h-9 w-9 shrink-0 rounded-full object-cover"
    />
    <div class="min-w-0">
      {#if user.name}
        <p class="truncate text-sm font-medium text-base-content">{user.name}</p>
      {/if}
      <p class="truncate text-xs text-base-content/50">{user.email}</p>
    </div>
  </div>

  <div class="border-t border-base-content/10"></div>

  <div class="p-1.5">
    <!-- Review TOS: server form (revokes consent, redirects to /accept-terms). -->
    <form
      method="POST"
      action="/accept-terms/?/revoke"
    >
      <button
        type="submit"
        class="item"
        onclick={() => close()}
      >
        <ContractIcon class="h-4 w-4 text-base-content/50" />
        <span>Review TOS</span>
      </button>
    </form>

    <button
      type="button"
      class="item item-danger"
      onclick={logout}
    >
      <LogoutIcon class="h-4 w-4 opacity-70" />
      <span>Log out</span>
    </button>
  </div>
</div>

<style>
  .menu-anim {
    opacity: 0;
    transform: scale(0.96) translateY(-4px);
    pointer-events: none;
    transition:
      opacity 150ms cubic-bezier(0.22, 0.61, 0.36, 1),
      transform 150ms cubic-bezier(0.22, 0.61, 0.36, 1);
  }
  .menu-anim.is-open {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }

  /* Full-width menu rows. */
  .item {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 0.75rem;
    border-radius: var(--radius-field, 0.5rem);
    padding: 0.5rem 0.625rem;
    text-align: left;
    font-size: 0.875rem;
    color: var(--color-base-content);
    transition:
      background-color 150ms ease,
      color 150ms ease;
  }
  @media (hover: hover) {
    .item:hover {
      background-color: color-mix(in oklab, var(--color-base-content) 8%, transparent);
    }
    .item-danger:hover {
      background-color: color-mix(in oklab, var(--color-error) 12%, transparent);
      color: var(--color-error);
    }
  }
  .item:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .menu-anim,
    .item {
      transition: none;
    }
  }
</style>
