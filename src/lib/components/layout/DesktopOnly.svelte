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

  let isDesktop = $state(true);

  onMount(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => (isDesktop = mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  });
</script>

{#if isDesktop}
  {@render children?.()}
{:else}
  <div class="flex flex-1 flex-col items-center justify-center app-gutter py-20 text-center">
    <div class="grid h-16 w-16 place-items-center rounded-2xl bg-base-200 text-base-content/70">
      <DesktopIcon class="h-7 w-7" />
    </div>
    <h1 class="mt-6 font-display text-2xl font-bold tracking-tight text-balance">
      Open this on a bigger screen
    </h1>
    <p class="mt-3 max-w-sm text-base-content/70">
      The {action} workspace needs the room of a laptop or desktop to work well. We're keeping it there
      for now — mobile support is on the way.
    </p>
    <ButtonLink
      class="btn-primary mt-8"
      href={backHref}
    >
      {backLabel}
    </ButtonLink>
  </div>
{/if}
