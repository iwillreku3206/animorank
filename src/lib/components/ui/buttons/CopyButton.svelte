<script lang="ts">
  import Button from './Button.svelte';
  import CopyIcon from '@iconify-svelte/fa6-solid/copy';
  import CheckIcon from '@iconify-svelte/fa6-solid/check';
  import XmarkIcon from '@iconify-svelte/fa6-solid/xmark';

  interface Props {
    /** Text placed on the clipboard. */
    value: string;
    /** Names what is copied, for the accessible label — e.g. "actual output". */
    label: string;
    class?: string;
  }

  let { value, label, class: className = '' }: Props = $props();

  let state = $state<'idle' | 'copied' | 'failed'>('idle');
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copy(event: MouseEvent) {
    if (event.detail !== 0) (event.currentTarget as HTMLElement | null)?.blur();

    // Clearing first means a rapid second click restarts the window rather
    // than letting the earlier timer cut the new feedback short.
    clearTimeout(timer);
    try {
      await navigator.clipboard.writeText(value);
      state = 'copied';
    } catch {
      // writeText needs a secure context and permission; both can fail, and
      // silently doing nothing would read as a dead button.
      state = 'failed';
    }
    timer = setTimeout(() => (state = 'idle'), 1000);
  }

  $effect(() => () => clearTimeout(timer));

  const title = $derived(state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : `Copy ${label}`);
</script>

<Button
  type="button"
  onclick={copy}
  {title}
  aria-label={title}
  class="btn-ghost btn-xs btn-square border {state === 'copied'
    ? 'text-success'
    : state === 'failed'
      ? 'text-error'
      : 'text-base-content/50 hover:text-base-content/70'} {className}"
>
  <!-- All three stacked and cross-faded rather than swapped by an if-block:
       the icons overlap instead of replacing each other, so the button never
       reflows mid-transition and never blinks empty between states. -->
  <span class="icon-stack relative block h-3 w-3">
    <span
      class="icon"
      class:is-on={state === 'idle'}><CopyIcon class="h-full w-full" /></span
    >
    <span
      class="icon"
      class:is-on={state === 'copied'}><CheckIcon class="h-full w-full" /></span
    >
    <span
      class="icon"
      class:is-on={state === 'failed'}><XmarkIcon class="h-full w-full" /></span
    >
  </span>
</Button>

<style>
  .icon-stack .icon {
    position: absolute;
    inset: 0;
    display: block;
    opacity: 0;
    /* Grown into place from slightly small, so the check reads as arriving
       rather than cutting in. */
    scale: 0.7;
  }

  .icon-stack .icon.is-on {
    opacity: 1;
    scale: 1;
  }

  @media (prefers-reduced-motion: no-preference) {
    .icon-stack .icon {
      transition-property: opacity, scale;
      transition-duration: 180ms;
      /* Matches the curve Button uses for its own colour transitions. */
      transition-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
    }
  }
</style>
