<script lang="ts">
  import type { Segment } from './whitespace';

  let { segments }: { segments: Segment[] } = $props();

  const GLYPH: Readonly<Record<string, string>> = {
    space: '·',
    tab: '→',
    newline: '⏎',
    return: '␍'
  };
</script>

<!-- Written on one line deliberately: this renders inside a <pre>, so a newline
     or an indent between these tags would show up on screen as part of the
     student's output. -->
<!-- prettier-ignore -->
{#each segments as segment, index (index)}{#if segment.kind === 'text'}{segment.value}{:else}<span class="ws" data-glyph={GLYPH[segment.kind]}>{segment.value}</span>{/if}{/each}

<style>
  /* The span holds the real whitespace and the glyph is painted on top of it,
     so selecting and copying the output still yields actual spaces and
     newlines rather than a line of dots. */
  .ws {
    position: relative;
  }

  .ws::before {
    content: attr(data-glyph);
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0.45;
    pointer-events: none;
  }
</style>
