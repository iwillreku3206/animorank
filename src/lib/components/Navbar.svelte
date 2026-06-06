<script lang="ts">
  import { signIn } from '@auth/sveltekit/client';
  import type { User } from '@auth/sveltekit';
  import Button from '$lib/components/buttons/Button.svelte';
  import MobileSettingsModal from '$lib/components/MobileSettingsModal.svelte';

  /** The authenticated user, or null/undefined if not logged in. */
  let { user }: { user: User | null | undefined } = $props();

  let loggedIn = $derived(!!user);
  let openSettings = $state(false);
</script>

<nav class="min-h-16 px-4 xl:px-32 flex flex-row items-center sticky top-0 left-0 right-0 bg-base-300 z-50">

  <!-- Brand -->
  <div class="relative mr-auto">
    <h1 class="font-bold text-2xl">
      <a href="/">AnimoRank</a>
    </h1>
  </div>

  <!-- Navigation links -->
  <div class="flex flex-row ml-auto mr-auto">
    <a class="px-4 text-base" href="/about">About Us</a>
    {#if loggedIn}
      <a class="px-4 text-base" href="/">Dashboard</a>
      <a class="px-4 text-base" href="/problemSets">Problem Sets</a>
    {/if}
  </div>

  <!-- User controls: profile button or login -->
  <div class="ml-auto">
    {#if loggedIn}
      <button
        type="button"
        class="btn btn-ghost hidden md:grid md:place-items-center overflow-hidden btn-circle"
        onclick={() => (openSettings = true)}
        aria-label="Open settings"
      >
        <img
          src={user?.image}
          alt="Profile"
          class="h-10 w-10 object-cover rounded-full"
        />
      </button>
    {:else}
      <Button onclick={() => signIn('google')}>Login</Button>
    {/if}
  </div>

</nav>

{#if openSettings && loggedIn && user}
  <MobileSettingsModal
    bind:openSettings
    {user}
  />
{/if}
