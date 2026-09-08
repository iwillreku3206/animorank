<script lang="ts">
  import type { User } from '@auth/sveltekit';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import AccountMenu from '$lib/components/settings/AccountMenu.svelte';
  import EditorSettingsModal from '$lib/components/settings/EditorSettingsModal.svelte';
  import PlayIcon from '@iconify-svelte/fa6-solid/play';
  import PaperPlaneIcon from '@iconify-svelte/fa6-solid/paper-plane';
  import GearIcon from '@iconify-svelte/fa6-solid/gear';
  import type { SolveWindowContext } from './context.svelte';

  let { context, user }: { context: SolveWindowContext; user: User } = $props();

  let settingsOpen = $state(false);
</script>

<header class="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center bg-base-300 px-2">
  <div class="justify-self-start">
    <a
      href="/"
      class="flex items-center"
      aria-label="AnimoRank home"
    >
      <img
        src="/brand/icon/animorank_icon_primary_dark.svg"
        alt=""
        class="h-7 w-auto transition-opacity hover:opacity-80"
      />
    </a>
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
