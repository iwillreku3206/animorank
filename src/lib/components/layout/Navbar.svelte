<script lang="ts">
  import { tick } from 'svelte';
  import { signIn } from '@auth/sveltekit/client';
  import type { User } from '@auth/sveltekit';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import AccountMenu from '$lib/components/settings/AccountMenu.svelte';
  import Link from '$lib/components/ui/Link.svelte';
  import MenuIcon from '@iconify-svelte/fa6-solid/bars';
  import XIcon from '@iconify-svelte/fa6-solid/xmark';

  /** The authenticated user, or null/undefined if not logged in. */
  let { user }: { user: User | null | undefined } = $props();

  let loggedIn = $derived(!!user);
  let openDrawer = $state(false);

  let drawerEl = $state<HTMLElement>();
  let menuTrigger = $state<HTMLElement | null>(null);

  const closeDrawer = () => (openDrawer = false);

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  // Lock body scroll while the drawer is open, but pad the body by the width of
  // the now-missing scrollbar so the page behind keeps its place instead of
  // widening (the "autoadjust" jump).
  $effect(() => {
    if (!openDrawer) return;
    const { body } = document;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  });

  // Treat the open drawer as a modal dialog: move focus into the panel on open
  // and return it to the hamburger on close. Tab is trapped inside the panel by
  // `trapFocus`, so keyboard users can't wander onto the page behind the
  // backdrop while it's dimmed.
  $effect(() => {
    if (!openDrawer) return;
    tick().then(() => drawerEl?.focus());
    return () => menuTrigger?.focus();
  });

  function trapFocus(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !drawerEl) return;
    const focusables = Array.from(drawerEl.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === drawerEl)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') openDrawer = false;
  }}
/>

<!-- Three-cell grid: left | center | right. Equal 1fr side columns keep the
     center cell optically centered in the viewport regardless of how wide the
     edge controls are, so the mobile logo can never collide with them. -->
<nav
  class="app-gutter safe-top sticky top-0 z-30 grid min-h-16 grid-cols-[1fr_auto_1fr] items-center bg-base-300"
>
  <!-- Left: hamburger (mobile) / brand wordmark (desktop) -->
  <div class="flex items-center justify-self-start">
    <Button
      bind:ref={menuTrigger}
      type="button"
      class="btn-ghost btn-square md:hidden"
      onclick={() => (openDrawer = true)}
      aria-label="Open menu"
      aria-expanded={openDrawer}
      aria-controls="mobile-nav"
    >
      <MenuIcon class="h-6 w-6" />
    </Button>

    <a
      href="/"
      class="hidden items-center md:flex"
      aria-label="AnimoRank home"
    >
      <img
        src="/brand/full/animorank_beta_full_primary_dark.svg"
        alt=""
        class="h-8 w-auto transition-opacity hover:opacity-80"
      />
    </a>
  </div>

  <!-- Center: brand logo (mobile) / nav links (desktop) -->
  <div class="min-w-0 justify-self-center">
    <a
      href="/"
      class="flex items-center md:hidden"
      aria-label="AnimoRank home"
    >
      <img
        src="/brand/full/animorank_beta_full_primary_dark.svg"
        alt=""
        class="max-h-7 w-auto max-w-full"
      />
    </a>

    <div class="hidden flex-row md:flex">
      <Link
        class="px-4 text-base"
        href="/about">About Us</Link
      >
      {#if loggedIn}
        <Link
          class="px-4 text-base"
          href="/problemSets">Problem Sets</Link
        >
      {/if}
    </div>
  </div>

  <!-- Right: account menu (avatar dropdown) / login. Stays on the bar at every
       width; the drawer holds nav only. -->
  <div class="justify-self-end">
    {#if loggedIn && user}
      <AccountMenu {user} />
    {:else}
      <Button onclick={() => signIn('google')}>Login</Button>
    {/if}
  </div>
</nav>

<!-- Mobile nav drawer. Backdrop + panel stay in the DOM so they animate both
     ways; `inert` keeps the closed panel out of tab order. Slides in from the
     left to match the hamburger's edge. The backdrop is mouse-only (tabindex
     -1); keyboard users dismiss via Esc or the close button. -->
<button
  class="drawer-anim fixed inset-0 z-40 bg-black/60 md:hidden"
  class:pointer-events-none={!openDrawer}
  style="opacity: {openDrawer ? 1 : 0}"
  onclick={closeDrawer}
  aria-label="Close menu"
  tabindex="-1"
></button>

<div
  bind:this={drawerEl}
  id="mobile-nav"
  class="drawer-anim fixed left-0 top-0 z-50 flex h-full w-72 max-w-[80vw] flex-col bg-base-200 shadow-xl md:hidden"
  style="transform: translateX({openDrawer ? '0' : '-100%'})"
  inert={!openDrawer}
  role="dialog"
  aria-modal="true"
  aria-label="Site menu"
  tabindex="-1"
  onkeydown={trapFocus}
>
  <div class="safe-top flex items-center justify-between border-b border-base-content/10 px-5 py-4">
    <a
      href="/"
      onclick={closeDrawer}
      aria-label="AnimoRank home"
    >
      <img
        src="/brand/full/animorank_beta_full_primary_dark.svg"
        alt=""
        class="h-7 w-auto"
      />
    </a>
    <Button
      type="button"
      class="btn-ghost btn-square"
      onclick={closeDrawer}
      aria-label="Close menu"
    >
      <XIcon class="h-5 w-5" />
    </Button>
  </div>

  <nav class="flex flex-col px-5 py-4">
    <Link
      class="py-2 text-base"
      href="/about"
      onclick={closeDrawer}>About Us</Link
    >
    {#if loggedIn}
      <Link
        class="py-2 text-base"
        href="/problemSets"
        onclick={closeDrawer}>Problem Sets</Link
      >
    {/if}
  </nav>

  {#if !loggedIn}
    <!-- Primary CTA in the thumb zone for one-handed use; mirrors the navbar
         login so logged-out users get it where the drawer already is. -->
    <div class="safe-bottom mt-auto border-t border-base-content/10 px-5 py-4">
      <Button
        class="btn-primary w-full"
        onclick={() => {
          closeDrawer();
          signIn('google');
        }}>Login</Button
      >
    </div>
  {/if}
</div>

<style>
  .drawer-anim {
    transition:
      transform 300ms cubic-bezier(0.22, 0.61, 0.36, 1),
      opacity 300ms cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  @media (prefers-reduced-motion: reduce) {
    .drawer-anim {
      transition: none;
    }
  }
</style>
