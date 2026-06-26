<script lang="ts">
  import { onMount } from 'svelte';
  import GoogleIcon from '@iconify-svelte/fa6-brands/google';
  import ArrowRightIcon from '@iconify-svelte/fa6-solid/arrow-right';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
  // import Badge from '$lib/components/ui/badges/Badge.svelte';
  import HeroGraph from './HeroGraph.svelte';
  import AutograderDemo from './AutograderDemo.svelte';
  import { signIn } from '@auth/sveltekit/client';
  import Seo from '$lib/components/layout/Seo.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  // Selected course drives the live autograder demo below (tabs = picker).
  let selectedCourse = $state('Variables');

  // Real topic tags from the platform (scripts/addDefaultTags.ts), grouped to
  // mirror the course arc — fundamentals → data → structures → algorithms — so
  // the section reads as a syllabus map instead of a wall of jargon.
  // const topicGroups = [
  //   { label: 'Fundamentals', topics: ['I/O', 'Conditions', 'Loops', 'Functions'] },
  //   { label: 'Working with data', topics: ['Arrays', 'Strings', 'Structs', 'Files'] },
  //   { label: 'Data structures', topics: ['Stacks', 'Queues', 'Trees', 'Graphs'] },
  //   {
  //     label: 'Algorithms',
  //     topics: [
  //       'Sorting',
  //       'Search',
  //       'Divide and Conquer',
  //       'Dynamic Programming',
  //       'Greedy Algorithms'
  //     ]
  //   }
  // ];

  let root: HTMLElement;

  onMount(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !root) return;

    root.classList.add('motion-ready');
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' }
    );
    root.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
</script>

<Seo />

{#snippet primaryCta(label: string, onGreen?: boolean)}
  {#if data.user}
    <ButtonLink
      class="btn-lg group font-semibold {onGreen ? 'btn-neutral' : 'btn-primary'}"
      href="/problemSets"
    >
      Go to your problem sets
      <ArrowRightIcon
        class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </ButtonLink>
  {:else}
    <Button
      class="btn-lg group gap-2.5 font-semibold {onGreen ? 'btn-neutral' : 'btn-primary'}"
      onclick={() => signIn('google')}
    >
      <GoogleIcon
        class="h-5 w-5"
        aria-hidden="true"
      />
      {label}
    </Button>
  {/if}
{/snippet}

<main
  bind:this={root}
  class="relative overflow-hidden bg-base-300 font-sans text-base-content"
>
  <!-- HERO: interactive course/topic graph; copy anchored bottom-left -->
  <section class="relative min-h-[90vh] overflow-hidden">
    <HeroGraph />

    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 z-10 app-gutter pb-16 text-left lg:pb-20"
    >
      <div class="pointer-events-auto max-w-2xl">
        <h1
          data-reveal="up"
          style="--d:80ms"
          class="font-display text-3xl leading-[1.03] font-bold tracking-tight text-balance lg:text-5xl"
        >
          Practice that follows your syllabus.
        </h1>

        <p
          data-reveal="up"
          style="--d:150ms"
          class="mt-6 max-w-[56ch] text-md leading-snug text-base-content/75 lg:text-lg"
        >
          Problems for the DLSU CS courses, organized by the topics your course covers. Currently
          CCPROG1, but with more on the way.
        </p>

        <div
          data-reveal="up"
          style="--d:230ms"
          class="mt-9 flex flex-col items-start gap-3"
        >
          {@render primaryCta('Start practicing')}
          {#if !data.user}
            <span class="text-sm text-base-content/55">
              Sign in with your DLSU Google account.
            </span>
          {/if}
        </div>
      </div>
    </div>
  </section>

  <!-- COURSES + LIVE PROOF: pick a course (left), run it in the editor (right) -->
  <section class="app-gutter py-20 lg:py-24">
    <div class="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
      <div class="max-w-2xl lg:col-span-4">
        <h2
          data-reveal="up"
          class="font-display text-3xl font-bold tracking-tight text-balance lg:text-5xl"
        >
          Built for your course, not someone else's.
        </h2>
        <p
          data-reveal="up"
          style="--d:80ms"
          class="mt-4 text-lg text-base-content/75"
        >
          Most practice problems are written for someone else. Practice a topic here and it is
          designed to match your course's coverage and style.
        </p>
      </div>

      <div
        data-reveal="up"
        style="--d:140ms"
        class="w-full lg:col-span-8"
      >
        <AutograderDemo
          selected={selectedCourse}
          onselect={(code) => (selectedCourse = code)}
        />
      </div>
    </div>
  </section>

  <!-- TOPICS + DIFFICULTY: mirrors the courses section — big visual on the left
       (2/3), copy on the right (1/3) — so the two sections alternate. -->
  <!-- <section class="px-4 py-20 lg:py-24 xl:px-32">
    <div class="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
      <div
        data-reveal="up"
        style="--d:120ms"
        class="flex flex-col gap-6 rounded-2xl border border-white/10 bg-base-200/60 p-6 lg:col-span-8 lg:p-8"
      >
        {#each topicGroups as group (group.label)}
          <div class="flex flex-col gap-2.5 sm:flex-row sm:items-baseline sm:gap-6">
            <span class="shrink-0 text-sm font-medium text-base-content/60 sm:w-32">
              {group.label}
            </span>
            <div class="flex flex-wrap gap-2">
              {#each group.topics as topic (topic)}
                <Badge class="badge-lg border-white/10 bg-base-100/60 text-base-content/85">
                  {topic}
                </Badge>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <div class="lg:col-span-4">
        <h2
          data-reveal="up"
          class="font-display text-3xl font-bold tracking-tight lg:text-5xl"
        >
          Find exactly what you need to drill.
        </h2>
        <p
          data-reveal="up"
          style="--d:80ms"
          class="mt-5 max-w-[46ch] text-lg leading-relaxed text-base-content/70"
        >
          Filter by topic and difficulty, then work a focused set. Studying for a long exam on
          pointers? Pull up every pointer problem and go.
        </p>
        <div
          data-reveal="up"
          style="--d:150ms"
          class="mt-8 flex flex-wrap gap-2.5"
        >
          <Badge class="badge-lg border-transparent bg-primary/15 text-primary">Basic</Badge>
          <Badge class="badge-lg border-transparent bg-accent/15 text-accent">Intermediate</Badge>
          <Badge class="badge-lg border-transparent bg-error/15 text-error">Advanced</Badge>
        </div>
      </div>
    </div>
  </section> -->

  <!-- CLOSING: the page's one committed brand moment — drenched green -->
  <section class="app-gutter pb-28 lg:pb-36">
    <div
      data-reveal="up"
      class="relative overflow-hidden rounded-3xl bg-primary px-7 py-16 text-primary-content lg:px-16 lg:py-24"
    >
      <div
        class="closing-dots pointer-events-none absolute inset-0"
        aria-hidden="true"
      ></div>
      <div class="relative max-w-2xl">
        <h2 class="font-display text-4xl font-bold tracking-tight text-balance lg:text-6xl">
          Practice now.
        </h2>
        <p class="mt-6 max-w-[46ch] text-lg leading-relaxed text-primary-content/80">
          Log in with your DLSU account to access your problem sets and start practicing.
        </p>
        <div class="mt-10">
          {@render primaryCta('Start practicing', true)}
        </div>
      </div>
    </div>
  </section>
</main>

<style>
  /* Restrained reveals. Active only once .motion-ready is set on mount, so
     server-rendered content is fully visible without JS. */
  :global(.motion-ready [data-reveal='up']) {
    opacity: 0;
    transform: translateY(14px);
    transition:
      opacity 0.6s cubic-bezier(0.22, 0.61, 0.36, 1),
      transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
    transition-delay: var(--d, 0ms);
  }
  :global(.motion-ready [data-reveal='up'].in-view) {
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.motion-ready [data-reveal]) {
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
    }
  }

  /* Closing CTA: a dark-on-green dot field echoing the hero's grid motif, so
     the brand-drenched section ties back to the top of the page. */
  .closing-dots {
    background-image: radial-gradient(
      color-mix(in oklch, var(--color-primary-content) 32%, transparent) 1.4px,
      transparent 1.5px
    );
    background-size: 24px 24px;
    -webkit-mask-image: radial-gradient(125% 135% at 92% 6%, black 0%, transparent 78%);
    mask-image: radial-gradient(125% 135% at 92% 6%, black 0%, transparent 78%);
  }
</style>
