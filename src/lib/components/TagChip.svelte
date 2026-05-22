<script lang="ts">
  import { type Tag, TagType, TagColor } from '$lib/zenstack/models';

  let {
    tag,
    href,
    class: className
  }: { tag: Tag; class?: string } & { href?: string | (() => void | Promise<void>) } = $props();
  const color = $derived(
    tag.color.startsWith('TAG_COLOR_') ? tag.color : `TAG_COLOR_${tag.color.toUpperCase()}`
  );
  const type = $derived(tag.type.startsWith('TAG_') ? tag.type : `TAG_${tag.type.toUpperCase()}`);

  const colorMap: Record<string, string> = $derived({
    [TagColor.TAG_COLOR_DEFAULT]: {
      [TagType.TAG_SUBJECT]: 'bg-secondary text-secondary-content',
      [TagType.TAG_DIFFICULTY]: 'bg-info text-into-content',
      [TagType.TAG_TOPIC]: 'bg-neutral text-neutral-content'
    }[type] as string,
    [TagColor.TAG_COLOR_PRIMARY]: 'bg-primary text-primary-content',
    [TagColor.TAG_COLOR_SECONDARY]: 'bg-secondary text-secondary-content',
    [TagColor.TAG_COLOR_ACCENT]: 'bg-accent text-accent-content',
    [TagColor.TAG_COLOR_RED]: 'bg-error text-primary-content',
    [TagColor.TAG_COLOR_YELLOW]: 'bg-warning text-primary-content',
    [TagColor.TAG_COLOR_GREEN]: 'bg-success text-primary-content',
    [TagColor.TAG_COLOR_BLUE]: 'bg-info text-primary-content'
  });
</script>

{#if typeof href === 'string'}
  <a
    {href}
    class="px-2 py-0.5 font-semibold text-sm leading-5 rounded-lg {colorMap[color]} {className}"
  >
    {tag.label}
  </a>
{:else}
  <button
    onclick={href}
    class="px-2 py-0.5 font-semibold text-sm leading-5 rounded-lg pointer {colorMap[
      color
    ]} {className}"
  >
    {tag.label}
  </button>
{/if}
