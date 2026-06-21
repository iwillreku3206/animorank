<script lang="ts">
  import Accordion from '$lib/components/ui/accordions/Accordion.svelte';
  import Link from '$lib/components/ui/Link.svelte';
  import { faqSections } from './faqs';
</script>

<svelte:head>
  <title>FAQs -- AnimoRank</title>
  <meta
    name="description"
    content="Answers to common questions about AnimoRank."
  />
</svelte:head>

<main class="flex-1 bg-base-300 px-4 py-20 text-base-content lg:py-28">
  <div class="mx-auto max-w-3xl">
    <header class="mb-12">
      <h1 class="font-display text-3xl font-bold tracking-tight text-balance lg:text-4xl">
        Frequently Asked Questions
      </h1>
      <p class="mt-4 text-md leading-relaxed text-base-content/75">
        Answers to common questions about AnimoRank.
      </p>
    </header>

    {#each faqSections as section (section.heading)}
      <section class="mb-10">
        <h2 class="mb-4 font-display text-2xl font-semibold text-base-content">
          {section.heading}
        </h2>
        <div class="space-y-2">
          {#each section.items as { q, a } (q)}
            <Accordion titleText={q}>
              {#each a as part, i (i)}
                {#if typeof part === 'string'}{part}{:else}<Link
                    href={part.href}
                    class="link-primary"
                    target={part.external ? '_blank' : undefined}
                    rel={part.external ? 'noopener noreferrer' : undefined}>{part.text}</Link
                  >{/if}
              {/each}
            </Accordion>
          {/each}
        </div>
      </section>
    {/each}
  </div>
</main>
