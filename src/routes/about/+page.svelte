<script lang="ts">
  import ArrowRightIcon from '@iconify-svelte/fa6-solid/arrow-right';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
</script>

<svelte:head>
  <title>About AnimoRank — coming soon</title>
  <meta
    name="description"
    content="The AnimoRank about page is under development."
  />
</svelte:head>

<main class="flex flex-1 items-center justify-center bg-base-300 px-4 py-24 text-base-content">
  <div class="max-w-xl text-center">
    <h1 class="mt-6 font-display text-3xl font-bold tracking-tight text-balance lg:text-5xl">
      This page is still being built.
    </h1>

    <p class="mt-5 text-lg leading-relaxed text-base-content/70">
      We're putting together a proper About page for AnimoRank. In the meantime, head back to the
      landing page to see what the platform is about.
    </p>

    <div class="mt-9 flex justify-center">
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
    </div>
  </div>
</main>
