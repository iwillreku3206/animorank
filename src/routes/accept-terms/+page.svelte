<script lang="ts">
  import { enhance } from '$app/forms';
  import TriangleExclamationIcon from '@iconify-svelte/fa6-solid/triangle-exclamation';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import TosCard from './TosCard.svelte';
  import Seo from '$lib/components/layout/Seo.svelte';

  let showModal = $state(false);
  let isConfirmed = $state(false);
  let accepting = $state(false);
  let deleting = $state(false);

  let checked = $state(Array(4).fill(false));
  let allChecked = $derived(checked.every(Boolean));

  let dialog = $state<HTMLDialogElement | null>(null);

  // Drive the native <dialog> from `showModal` so we inherit the platform's
  // focus trap, Esc-to-close, and focus restoration instead of reimplementing them.
  $effect(() => {
    if (!dialog) return;
    if (showModal && !dialog.open) dialog.showModal();
    else if (!showModal && dialog.open) dialog.close();
  });
</script>

<Seo
  title="Accept the Terms of Service"
  noindex
/>

<div class="w-full max-w-2xl mx-auto px-6 py-12 flex flex-col gap-8">
  <header class="flex flex-col gap-3">
    <h1 class="font-display text-3xl font-bold tracking-tight text-balance">Terms of Service</h1>
    <p>Before using AnimoRank, you must understand that:</p>
  </header>

  <div class="bg-base-100 rounded-lg divide-y divide-base-content/10 overflow-hidden">
    <TosCard bind:checked={checked[0]}>
      This platform is an optional practice tool and is not a hard requirement for any course.
    </TosCard>
    <TosCard bind:checked={checked[1]}>
      This platform collects interaction data, including coding logs and session interactions, for the purposes of
      improving the platform and for academic research.
    </TosCard>
    <TosCard bind:checked={checked[2]}>
      Such data, when collected, will always be anonymized prior to any kind of analysis.
    </TosCard>
    <TosCard bind:checked={checked[3]}>
      By using AnimoRank, you agree to our <a
        target="_blank"
        rel="noopener noreferrer"
        href="/legal/terms-of-service"
        class="text-primary inline"
      >
        Terms of Service
      </a>. You can revoke your consent at any time.
    </TosCard>
  </div>

  <div class="flex flex-col gap-3">
    <form
      method="POST"
      action="?/accept"
      use:enhance={() => {
        accepting = true;
        return async ({ update }) => {
          await update();
          accepting = false;
        };
      }}
      class="flex flex-row gap-3 w-full"
    >
      <Button
        name="accept"
        type="submit"
        class="btn-primary w-auto disabled:cursor-not-allowed"
        disabled={!allChecked || accepting}
        aria-describedby="accept-hint"
      >
        {#if accepting}
          <span
            class="loading loading-spinner loading-sm"
            aria-hidden="true"
          ></span>
        {/if}
        Accept and continue
      </Button>
      <Button
        type="button"
        onclick={() => (showModal = true)}
        class="btn-ghost w-auto"
      >
        Decline
      </Button>
    </form>
    <p
      id="accept-hint"
      aria-live="polite"
      class="min-h-5 text-sm text-base-content/70"
    >
      {#if !allChecked}Check all four boxes above to continue.{/if}
    </p>
  </div>

  <dialog
    bind:this={dialog}
    onclose={() => {
      showModal = false;
      isConfirmed = false;
    }}
    onclick={(e) => {
      if (e.target === dialog) dialog?.close();
    }}
    aria-labelledby="decline-title"
    aria-describedby="decline-desc"
    class="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm rounded-lg bg-base-100 p-0 shadow-xl backdrop:bg-base-300/70"
  >
    <div class="p-6">
      <div class="flex items-start gap-4">
        <div
          class="grid size-10 shrink-0 place-items-center rounded-full bg-error/15 text-error"
          aria-hidden="true"
        >
          <TriangleExclamationIcon class="h-5 w-5" />
        </div>
        <div class="flex flex-col gap-1.5 pt-1">
          <h2
            id="decline-title"
            class="text-lg font-bold leading-tight"
          >
            Delete your account?
          </h2>
          <p
            id="decline-desc"
            class="text-sm leading-relaxed text-base-content"
          >
            AnimoRank can only be used once you accept the Terms of Service. If you decline, your account and its data
            will be permanently deleted. This can't be undone.
          </p>
        </div>
      </div>

      <label
        class="mt-5 flex cursor-pointer items-center gap-3 rounded-lg border border-error/20 bg-error/10 p-3 transition-colors hover:bg-error/15"
      >
        <input
          type="checkbox"
          bind:checked={isConfirmed}
          class="checkbox checkbox-error shrink-0"
        />
        <span class="text-sm text-base-content"> I understand this will permanently delete my account. </span>
      </label>

      <div class="mt-6 flex items-center justify-between gap-3">
        <Button
          type="button"
          onclick={() => (showModal = false)}
          class="btn-ghost w-auto whitespace-nowrap"
        >
          Keep my account
        </Button>
        <form
          method="POST"
          action="?/deleteAccount"
          use:enhance={() => {
            deleting = true;
            return async ({ update }) => {
              await update();
              deleting = false;
            };
          }}
        >
          <Button
            type="submit"
            disabled={!isConfirmed || deleting}
            class="btn-error w-auto whitespace-nowrap disabled:cursor-not-allowed"
          >
            {#if deleting}
              <span
                class="loading loading-spinner loading-sm"
                aria-hidden="true"
              ></span>
            {/if}
            Delete my account
          </Button>
        </form>
      </div>
    </div>
  </dialog>
</div>

<style>
  /* Entrance/exit for the confirm dialog. The closed state (opacity 0, nudged
     down) is the transition origin; `@starting-style` primes it on open and
     `allow-discrete` lets `display`/`overlay` animate so the exit plays too. */
  @media (prefers-reduced-motion: no-preference) {
    dialog {
      opacity: 0;
      translate: 0 0.5rem;
      transition:
        opacity 200ms cubic-bezier(0.25, 1, 0.5, 1),
        translate 200ms cubic-bezier(0.25, 1, 0.5, 1),
        overlay 200ms allow-discrete,
        display 200ms allow-discrete;
    }

    dialog[open] {
      opacity: 1;
      translate: 0 0;
    }

    @starting-style {
      dialog[open] {
        opacity: 0;
        translate: 0 0.5rem;
      }
    }

    dialog::backdrop {
      opacity: 0;
      transition:
        opacity 200ms cubic-bezier(0.25, 1, 0.5, 1),
        overlay 200ms allow-discrete,
        display 200ms allow-discrete;
    }

    dialog[open]::backdrop {
      opacity: 1;
    }

    @starting-style {
      dialog[open]::backdrop {
        opacity: 0;
      }
    }
  }
</style>
