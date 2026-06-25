<script lang="ts">
  import { onMount } from 'svelte';
  import Seo from '$lib/components/layout/Seo.svelte';
  import { entries } from '$lib/changelog';

  // Parse as UTC so YYYY-MM-DD dates never shift a day under local timezones.
  const formatDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });

  // Compact form for the narrow side rail.
  const formatDateShort = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });

  let activeSlug = $state(entries[0]?.slug ?? '');

  // Scroll-spy: mirror the legal pages' rail so the active entry tracks the
  // reader's position. Same observer geometry as terms-of-service.
  onMount(() => {
    const articles = document.querySelectorAll('article[id]');
    const observer = new IntersectionObserver(
      (observed) => {
        for (const entry of observed) {
          if (entry.isIntersecting) {
            activeSlug = entry.target.id;
            break;
          }
        }
      },
      { rootMargin: '-10% 0px -75% 0px' }
    );
    articles.forEach((a) => observer.observe(a));
    return () => observer.disconnect();
  });
</script>

<Seo
  title="Changelog"
  description="What's new in AnimoRank — new features, improvements, and fixes."
/>

<svelte:head>
  <link
    rel="alternate"
    type="application/rss+xml"
    title="AnimoRank changelog"
    href="/changelog/rss.xml"
  />
</svelte:head>

<main class="flex-1 bg-base-300 text-base-content">
  <div
    class="app-gutter flex flex-col items-start gap-10 py-12 justify-center lg:flex-row lg:gap-16"
  >
    <!-- Entry rail (scroll-spy TOC; hidden on mobile where readers just scroll). -->
    {#if entries.length > 0}
      <aside class="hidden lg:sticky lg:top-20 lg:block lg:h-fit lg:w-56">
        <h2 class="mb-4 font-display text-sm font-semibold">Changelog</h2>
        <nav class="flex flex-col">
          {#each entries as entry (entry.slug)}
            <a
              href={`#${entry.slug}`}
              onclick={() => (activeSlug = entry.slug)}
              class="block border-l-2 py-2 pl-4 transition-colors duration-250
                {activeSlug === entry.slug
                ? 'border-primary text-base-content'
                : 'border-neutral text-base-content/70 hover:text-base-content'}"
            >
              <span class="block text-xs font-medium text-base-content/70">
                {formatDateShort(entry.date)}
              </span>
              <span class="block text-sm">{entry.title}</span>
            </a>
          {/each}
        </nav>
      </aside>
    {/if}

    <!-- Entries -->
    <div class="w-full max-w-2xl">
      <header class="mb-12">
        <h1 class="font-display text-3xl font-bold tracking-tight text-balance lg:text-4xl">
          Changelog
        </h1>
        <p class="mt-4 text-base leading-relaxed text-base-content/70">
          New features, improvements, and fixes in AnimoRank.
          <a
            href="/changelog/rss.xml"
            class="link-primary whitespace-nowrap"
          >
            Subscribe via RSS
          </a>.
        </p>
      </header>

      {#if entries.length === 0}
        <p class="text-base-content/70">No entries yet — check back soon.</p>
      {:else}
        <div class="space-y-16">
          {#each entries as entry (entry.slug)}
            {@const Body = entry.body}
            <article
              id={entry.slug}
              class="scroll-mt-24"
            >
              <a
                href={`#${entry.slug}`}
                class="group block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-base-300"
              >
                <time
                  datetime={entry.date}
                  class="text-sm font-medium text-base-content/70"
                >
                  {formatDate(entry.date)}
                </time>
                <h2
                  class="mt-1 font-display text-2xl font-semibold text-base-content group-hover:text-primary"
                >
                  {entry.title}<span
                    aria-hidden="true"
                    class="ml-2 text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                    >#</span
                  >
                </h2>
              </a>
              <div class="prose prose-daisy mt-4 max-w-none">
                <Body />
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</main>
