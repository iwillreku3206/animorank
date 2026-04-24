<script lang="ts">
  import { type Tag, TagType, TagColor } from '$lib/zenstack/models';

  let {
    tag,
    href,
    class: className
  }: { tag: Tag; class?: string } & { href?: string | (() => void | Promise<void>) } = $props();

  const colorMap: Record<TagColor, string> = $derived({
    [TagColor.TAG_COLOR_DEFAULT]: {
      [TagType.TAG_SUBJECT]: 'bg-secondary text-secondary-content',
      [TagType.TAG_DIFFICULTY]: 'bg-info text-into-content',
      [TagType.TAG_TOPIC]: 'bg-neutral text-neutral-content'
    }[tag.type],
    [TagColor.TAG_COLOR_PRIMARY]: 'bg-primary text-primary-content',
    [TagColor.TAG_COLOR_SECONDARY]: 'bg-secondary text-secondary-content',
    [TagColor.TAG_COLOR_ACCENT]: 'bg-accent text-accent-content',
    [TagColor.TAG_COLOR_RED]: 'bg-error text-primary-content',
    [TagColor.TAG_COLOR_YELLOW]: 'bg-warning text-primary-content',
    [TagColor.TAG_COLOR_GREEN]: 'bg-success text-primary-content',
    [TagColor.TAG_COLOR_BLUE]: 'bg-info bg-primary-content'
  });
</script>

{#if typeof href === 'string'}
  <a
    {href}
    class="px-2 py-0.5 font-mono text-xs rounded-lg {colorMap[tag.color]} {className}"
  >
    {tag.label}
  </a>
{:else}
  <button
    onclick={href}
    class="px-2 py-0.5 font-mono text-xs rounded-lg pointer {colorMap[tag.color]} {className}"
  >
    {tag.label}
  </button>
{/if}
