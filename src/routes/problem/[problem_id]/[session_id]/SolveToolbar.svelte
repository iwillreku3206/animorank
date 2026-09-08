<script lang="ts">
  import type { User } from '@auth/sveltekit';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import AccountMenu from '$lib/components/settings/AccountMenu.svelte';
  import EditorSettingsModal from '$lib/components/settings/EditorSettingsModal.svelte';
  import PlayIcon from '@iconify-svelte/fa6-solid/play';
  import PaperPlaneIcon from '@iconify-svelte/fa6-solid/paper-plane';
  import GearIcon from '@iconify-svelte/fa6-solid/gear';
  import ListIcon from '@iconify-svelte/fa6-solid/list';
  import ChevronLeftIcon from '@iconify-svelte/fa6-solid/chevron-left';
  import ChevronRightIcon from '@iconify-svelte/fa6-solid/chevron-right';
  import { problemHref, problemSetHref } from '$lib/navigation';
  import type { ProblemLink } from '$lib/problem';
  import type { SolveWindowContext } from './context.svelte';

  let {
    context,
    user,
    neighbors
  }: {
    context: SolveWindowContext;
    user: User;
    /** The problems either side of this one in its set; `null` at either end. */
    neighbors: { previous: ProblemLink | null; next: ProblemLink | null };
  } = $props();

  let settingsOpen = $state(false);

  const stepLabels = {
    previous: 'Previous problem',
    next: 'Next problem'
  } as const;
</script>

{#snippet stepLink(target: ProblemLink | null, direction: 'previous' | 'next')}
  {@const label = stepLabels[direction]}
  <span
    class="inline-flex"
    title={target ? `${label}: ${target.name}` : `No ${direction} problem in this set`}
  >
    <Button
      class="btn-ghost btn-sm btn-square"
      href={target ? problemHref(target.id) : undefined}
      disabled={target ? undefined : true}
      aria-label={label}
    >
      {#if direction === 'previous'}
        <ChevronLeftIcon
          class="h-3.5 w-3.5"
          aria-hidden="true"
        />
      {:else}
        <ChevronRightIcon
          class="h-3.5 w-3.5"
          aria-hidden="true"
        />
      {/if}
    </Button>
  </span>
{/snippet}

<header class="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center bg-base-300 px-2">
  <div class="flex flex-row items-center gap-1 justify-self-start">
    <a
      href="/"
      class="flex items-center pr-1"
      aria-label="AnimoRank home"
    >
      <img
        src="/brand/icon/animorank_icon_primary_dark.svg"
        alt=""
        class="h-7 w-auto transition-opacity hover:opacity-80"
      />
    </a>

    <div
      class="mr-1 h-5 w-px bg-base-content/15"
      aria-hidden="true"
    ></div>

    <Button
      class="btn-ghost btn-sm gap-2"
      href={problemSetHref(context.problem.problem_set_id)}
      title="Back to this problem's set"
    >
      <ListIcon
        class="h-3.5 w-3.5"
        aria-hidden="true"
      />
      Problem set
    </Button>
    {@render stepLink(neighbors.previous, 'previous')}
    {@render stepLink(neighbors.next, 'next')}
  </div>

  <!-- Primary actions. Both lock while a run is in flight; the editor panel
       shows the accompanying spinner overlay. -->
  <div class="flex flex-row items-center gap-2 justify-self-center">
    <Button
      class="btn-sm gap-2"
      onclick={() => context.run()}
      disabled={context.editorState.locked}
    >
      <PlayIcon
        class="h-3.5 w-3.5"
        aria-hidden="true"
      />
      Run
    </Button>
    <Button
      class="btn-sm btn-primary gap-2"
      onclick={() => context.submit()}
      disabled={context.editorState.locked}
    >
      <PaperPlaneIcon
        class="h-3.5 w-3.5"
        aria-hidden="true"
      />
      Submit
    </Button>
  </div>

  <div class="flex flex-row items-center gap-1 justify-self-end">
    <Button
      type="button"
      class="btn-ghost btn-sm btn-square"
      onclick={() => (settingsOpen = true)}
      title="Editor settings"
      aria-label="Editor settings"
      aria-haspopup="dialog"
    >
      <GearIcon class="h-4 w-4" />
    </Button>
    <AccountMenu
      {user}
      compact
    />
  </div>
</header>

<EditorSettingsModal bind:open={settingsOpen} />
