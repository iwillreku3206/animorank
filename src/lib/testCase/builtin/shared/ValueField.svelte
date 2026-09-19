<script lang="ts">
  import CopyButton from '$lib/components/ui/buttons/CopyButton.svelte';
  import WhitespaceText from './WhitespaceText.svelte';
  import type { Segment } from './whitespace';

  interface Props {
    label: string;
    value: string;
    /** 'error' renders the value in the error color; used for stderr, compiler
     * output, and other failure text. */
    tone?: 'normal' | 'error';
    /** Shown, muted and italic, in place of an empty value — e.g.
     * "(no output)". The box itself can't distinguish "printed nothing" from
     * "never ran", so the placeholder says which. Omit for a field that is
     * never empty in practice (e.g. an exit code). */
    placeholder?: string;
    /**
     * Draw the value from these segments instead of as plain text, so that
     * whitespace a reader cannot see gets a glyph. `value` is still the string
     * behind the box -- it is what the copy button hands over and what decides
     * whether the field is empty -- so the segments must reassemble to it.
     */
    segments?: Segment[];
    /**
     * Wrap long lines (the default). Pass false for a field being compared
     * against another, where a wrapped line would read as two lines and invent
     * a difference; the box scrolls sideways instead.
     */
    wrap?: boolean;
  }

  let { label, value, tone = 'normal', placeholder = '', segments, wrap = true }: Props = $props();

  const empty = $derived(value === '');
</script>

<div class="flex flex-col gap-2">
  <span class="text-xs font-medium tracking-wide text-base-content/50">{label}</span>
  <div class="value-box relative">
    <!-- prettier-ignore -->
    <pre
      class="overflow-x-auto rounded-lg bg-base-100 px-3 py-2 font-mono text-xs leading-relaxed {wrap ? 'whitespace-pre-wrap' : 'whitespace-pre'} {empty
        ? 'text-base-content/50 italic'
        : tone === 'error'
          ? 'text-error'
          : 'text-base-content'}">{#if empty}{placeholder}{:else if segments}<WhitespaceText {segments} />{:else}{value}{/if}</pre>
    {#if !empty}
      <div class="copy-slot absolute top-1 right-1 transition-opacity">
        <CopyButton
          {value}
          label={label.toLowerCase()}
        />
      </div>
    {/if}
  </div>
</div>

<style>
  @media (hover: hover) {
    .copy-slot {
      opacity: 0;
    }

    .value-box:hover .copy-slot,
    .copy-slot:focus-within {
      opacity: 1;
    }
  }
</style>
