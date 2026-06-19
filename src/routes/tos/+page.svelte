<script lang="ts">
  import { enhance } from '$app/forms';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import TosCard from './TosCard.svelte';

  let showModal = $state(false);
  let isConfirmed = $state(false);

  let checked = $state(Array(4).fill(false));
</script>

<div class="w-full max-w-2xl mx-auto p-6 flex flex-col gap-2">
  <div class="flex flex-col gap-4 py-8">
    <h1 class="text-3xl font-bold">Terms of Service</h1>
    <p>Before using AnimoRank, you must understand that:</p>
  </div>

  <TosCard bind:checked={checked[0]}>
    This platform is an optional practice tool and is not a hard requirement for any course.
  </TosCard>
  <TosCard bind:checked={checked[1]}>
    This platform collects interaction data, including coding logs and session interactions, for the
    purposes of improving the platform and for academic research.
  </TosCard>
  <TosCard bind:checked={checked[2]}>
    Such data, when collected, will always be anonymized prior to any kind of analysis.
  </TosCard>
  <TosCard bind:checked={checked[3]}>
    By using the platform, you agree to our <a
      target="_blank"
      href="/legal/terms-of-service"
      class="text-primary inline"
    >
      Terms of Service
    </a>, and that you may revoke your consent at any point in time.
  </TosCard>

  <form
    method="POST"
    action="?/accept"
    use:enhance
    class="flex flex-row gap-2 w-full"
  >
    <Button
      name="accept"
      type="submit"
      class="w-auto disabled:cursor-not-allowed disabled:bg-neutral disabled:text-neutral-content"
      disabled={!checked.reduce((p, n) => p && n, true)}
    >
      Accept
    </Button>
    <Button
      type="button"
      onclick={() => (showModal = true)}
      class="bg-neutral! text-neutral-content! w-auto"
    >
      Decline
    </Button>
  </form>

  {#if showModal}
    <div class="fixed inset-0 bg-base-300/50 flex items-center justify-center z-50">
      <div class="bg-base-100 p-6 rounded-lg max-w-sm w-full mx-4 shadow-xl">
        <h2 class="text-xl font-bold mb-4">Confirm Account Deletion</h2>
        <p class="text-base-content mb-4">
          You have declined the Terms of Service. If you do not accept them, you will not be able to
          use AnimoRank. Are you sure you want to delete your account? This action cannot be undone.
        </p>

        <label class="flex flex-row items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            bind:checked={isConfirmed}
            class="checkbox rounded-sm checkbox-primary"
          />
          <span class="text-sm text-base-content">
            Yes. I confirm I want to delete my account.
          </span>
        </label>

        <div class="flex justify-end gap-3">
          <Button
            type="button"
            onclick={() => {
              showModal = false;
              isConfirmed = false;
            }}
            class="bg-neutral! text-neutral-content!"
          >
            Cancel
          </Button>
          <form
            method="POST"
            action="?/deleteAccount"
            use:enhance
          >
            <Button
              type="submit"
              disabled={!isConfirmed}
              class="bg-error! text-error-content!"
            >
              Delete Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  {/if}
</div>
