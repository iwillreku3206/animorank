<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    image,
    flip,
    children
  }: { title: string; image: { src: string; alt: string }; flip?: boolean; children?: Snippet } =
    $props();
</script>

<div class="flex flex-col {flip ? 'xl:flex-row-reverse' : 'xl:flex-row'} gap-8 xl:gap-32">
  <div class="flex flex-col gap-10">
    <h3 class="text-3xl font-bold">{title}</h3>

    {@render children?.()}
  </div>
  <img
    class="rounded-lg border border-white lg:max-w-1/2 aspect-video object-contain"
    src={image.src}
    alt={image.alt}
  />
</div>
