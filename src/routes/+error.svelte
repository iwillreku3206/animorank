<!--
  Error boundary for the whole app. SvelteKit renders this for any unmatched
  route (404) and for thrown load errors, inside the root layout — so the navbar
  and footer stay in place around it.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
  import Seo from '$lib/components/layout/Seo.svelte';
  import ArrowRightIcon from '@iconify-svelte/fa6-solid/arrow-right';
  import LinkSlashIcon from '@iconify-svelte/fa6-solid/link-slash';

  const is404 = $derived(page.status === 404);
  // Layout data merges into page.data, so the secondary action can stay
  // auth-aware the same way the landing page is.
  const user = $derived(page.data?.user);

  // The path the visitor tried to reach, shown back to them as a graph node.
  const attempted = $derived(page.url.pathname.replace(/\/$/, '') || '/');

  const heading = $derived(is404 ? "We couldn't find that page." : 'Something went wrong.');
  const message = $derived(
    is404 ? 'The link may be old, or the page may have moved.' : 'An unexpected error stopped this page from loading.'
  );

  // Reveal enhances an already-visible default: content renders fully on the
  // server, and the entrance only engages once JS mounts and motion is allowed.
  let root: HTMLElement;
  onMount(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && root) root.classList.add('motion-ready');
  });
</script>

<Seo
  title={is404 ? 'Page not found' : 'Something went wrong'}
  description={message}
  noindex
/>

<main
  bind:this={root}
  class="app-gutter relative flex flex-1 items-center justify-center overflow-hidden bg-base-300 py-24 text-base-content"
>
  <!-- brand motif: the same faded dotted grid the hero graph sits on -->
  <div
    class="bg-dots pointer-events-none absolute inset-0"
    aria-hidden="true"
  ></div>

  <div class="relative z-10 mx-auto flex max-w-xl flex-col items-center text-center">
    <p
      data-reveal
      style="--d:0ms"
      class="font-display text-[clamp(4rem,13vw,6rem)] leading-none font-bold tracking-tight text-base-content"
    >
      {page.status}
    </p>

    <h1
      data-reveal
      style="--d:80ms"
      class="mt-6 font-display text-2xl font-bold tracking-tight text-balance lg:text-3xl"
    >
      {heading}
    </h1>

    <p
      data-reveal
      style="--d:150ms"
      class="mt-4 max-w-[48ch] text-lg leading-relaxed text-balance text-base-content/70"
    >
      {message}
    </p>

    {#if is404}
      <!-- the node the visitor was looking for — present, but unlinked -->
      <span
        data-reveal
        style="--d:200ms"
        class="node-chip mt-7 inline-flex max-w-full items-center gap-2"
      >
        <LinkSlashIcon
          class="node-chip__icon h-3 w-3 shrink-0"
          aria-hidden="true"
        />
        <span class="truncate">{attempted}</span>
      </span>
    {/if}

    <div
      data-reveal
      style="--d:260ms"
      class="mt-10 flex flex-col items-center gap-3 sm:flex-row"
    >
      <ButtonLink
        class="btn-lg group btn-primary gap-2.5 font-semibold"
        href="/"
      >
        Back to home
        <ArrowRightIcon
          class="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </ButtonLink>

      {#if user}
        <ButtonLink
          class="btn-lg btn-ghost font-medium"
          href="/problemSets"
        >
          Go to your problem sets
        </ButtonLink>
      {:else}
        <ButtonLink
          class="btn-lg btn-ghost font-medium"
          href="/faqs"
        >
          Read the FAQs
        </ButtonLink>
      {/if}
    </div>
  </div>
</main>

<style>
  /* Same dotted-grid recipe as the hero graph, faded toward the edges so the
     centred content stays clean. Purely decorative. */
  .bg-dots {
    background-image: radial-gradient(
      color-mix(in oklch, var(--color-base-content) 12%, transparent) 1.1px,
      transparent 1.2px
    );
    background-size: 30px 30px;
    background-position: center;
    -webkit-mask-image: radial-gradient(115% 95% at 50% 42%, black 40%, transparent 82%);
    mask-image: radial-gradient(115% 95% at 50% 42%, black 40%, transparent 82%);
  }

  /* Mirrors HeroGraph's course "badge-node" so the failed path reads in the
     graph's own node language. */
  .node-chip {
    border-radius: 7px;
    border: 1px solid color-mix(in oklch, var(--color-base-content) 14%, transparent);
    background: color-mix(in oklch, var(--color-base-100) 92%, transparent);
    padding: 4px 10px;
    font-size: 12px;
    line-height: 1.4;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: var(--color-base-content);
    box-shadow: 0 1px 2px color-mix(in oklch, black 22%, transparent);
  }
  .node-chip :global(.node-chip__icon) {
    opacity: 0.6;
  }

  /* Restrained staggered entrance. Active only once .motion-ready is set on
     mount, so server-rendered content is fully visible without JS. */
  :global(.motion-ready [data-reveal]) {
    opacity: 0;
    transform: translateY(12px);
    animation: reveal-in 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) var(--d, 0ms) forwards;
  }

  @keyframes reveal-in {
    to {
      opacity: 1;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.motion-ready [data-reveal]) {
      opacity: 1;
      transform: none;
      animation: none;
    }
  }
</style>
