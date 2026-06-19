<script lang="ts">
  import type { Tag } from '$lib/zenstack/models';
  import { tagVariantBadgeClass } from '$lib/tag/tagVariant';
  import Badge from './badges/Badge.svelte';
  import ClickableBadge from './badges/ClickableBadge.svelte';

  type Props = {
    tag: Pick<Tag, 'label' | 'type' | 'order'>;
    /** Render as a link to this URL. */
    href?: string;
    /** Render as a button with this click handler. */
    onclick?: (_event: MouseEvent) => void;
    class?: string;
  };

  let { tag, href, onclick, class: className }: Props = $props();

  const variantClass = $derived(tagVariantBadgeClass(tag));
  const interactive = $derived(href !== undefined || onclick !== undefined);
</script>

{#if interactive}
  <ClickableBadge
    {href}
    {onclick}
    class="{variantClass} {className}">{tag.label}</ClickableBadge
  >
{:else}
  <Badge class="{variantClass} {className}">{tag.label}</Badge>
{/if}
