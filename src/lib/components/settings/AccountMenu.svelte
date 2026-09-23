<script lang="ts">
  import type { User } from '@auth/sveltekit';
  import { signOut } from '@auth/sveltekit/client';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import Dropdown from '$lib/components/ui/dropdowns/Dropdown.svelte';
  import DropdownItem from '$lib/components/ui/dropdowns/DropdownItem.svelte';
  import DropdownSeparator from '$lib/components/ui/dropdowns/DropdownSeparator.svelte';
  import ContractIcon from '@iconify-svelte/fa6-solid/file-contract';
  import LogoutIcon from '@iconify-svelte/fa6-solid/arrow-right-from-bracket';

  let { user, compact = false }: { user: User; compact?: boolean } = $props();

  // "Review TOS" is a server form post — it revokes consent, then redirects to
  // /accept-terms. A plain link would GET the page and skip the revoke, so the
  // menu item submits this hidden form instead.
  let revokeForm = $state<HTMLFormElement | null>(null);
</script>

<Dropdown
  label="Account"
  class="w-64 max-w-[calc(100vw-1rem)] overflow-hidden bg-base-200 p-0"
>
  {#snippet trigger(props)}
    <Button
      {...props}
      type="button"
      class="btn-ghost btn-circle grid place-items-center overflow-hidden {compact ? 'btn-sm' : ''}"
      aria-label="Account menu"
    >
      <img
        src={user.image}
        alt=""
        class="rounded-full object-cover {compact ? 'h-7 w-7' : 'h-10 w-10'}"
      />
    </Button>
  {/snippet}

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

  <DropdownSeparator class="mx-0 my-0" />

  <div class="p-1.5">
    <DropdownItem onSelect={() => revokeForm?.requestSubmit()}>
      <ContractIcon class="h-4 w-4 text-base-content/50" />
      <span>Review TOS</span>
    </DropdownItem>

    <DropdownItem
      variant="danger"
      onSelect={() => signOut()}
    >
      <LogoutIcon class="h-4 w-4 opacity-70" />
      <span>Log out</span>
    </DropdownItem>
  </div>
</Dropdown>

<form
  bind:this={revokeForm}
  method="POST"
  action="/accept-terms/?/revoke"
  class="hidden"
></form>
