<script lang="ts">
  import { onMount } from 'svelte';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
  import DesktopIcon from '@iconify-svelte/fa6-solid/desktop';

  let {
    children,
    action = 'practice',
    backHref = '/problemSets',
    backLabel = 'Back to problem sets'
  }: {
    children?: import('svelte').Snippet;
    action?: string;
    backHref?: string;
    backLabel?: string;
  } = $props();

  /**
   * Whether the workspace has been allowed to mount. This latches on and is
   * never cleared: unmounting the children would dispose the Monaco model
   * along with the rest of the solve view, and the remount rebuilds its state
   * from the page-load snapshot of the session, silently throwing away
   * everything typed since. Narrowing the viewport after the fact only covers
   * the workspace with the notice below, so nothing is torn down.
   */
  let mounted = $state(false);

  /**
   * Whether the viewport is currently below the breakpoint. Used only to take
   * the covered workspace out of the tab order — the notice itself is shown
   * and hidden by CSS, so it is already correct in the server-rendered markup.
   */
  let narrow = $state(false);

  onMount(() => {
    const mq = window.matchMedia('(min-width: 64rem)');
    const update = () => {
      mounted ||= mq.matches;
      narrow = !mq.matches;
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  });
</script>

<div class="relative flex min-h-0 flex-1 flex-col">
  {#if mounted}
    <div
      class="flex min-h-0 flex-1 flex-col"
      inert={narrow}
    >
      {@render children?.()}
    </div>
  {/if}

  <!--
    Always rendered, revealed only below `lg`. Keeping the breakpoint in CSS
    rather than in the `{#if}` means the notice is correct on first paint, so a
    phone never flashes the desktop workspace while it waits for hydration.
  -->
  <div
    class="app-gutter absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto bg-base-300 py-20 text-center lg:hidden"
  >
    <div class="grid h-16 w-16 place-items-center rounded-2xl bg-base-200 text-base-content/70">
      <DesktopIcon class="h-7 w-7" />
    </div>
    <h1 class="mt-6 font-display text-2xl font-bold tracking-tight text-balance">Open this on a bigger screen</h1>
    <p class="mt-3 max-w-sm text-base-content/70">
      The {action} workspace needs the room of a laptop or desktop to work well. We're keeping it there for now — mobile support
      is on the way.
    </p>
    <ButtonLink
      class="btn-primary mt-8"
      href={backHref}
    >
      {backLabel}
    </ButtonLink>
  </div>
</div>
