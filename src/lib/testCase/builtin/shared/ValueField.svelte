<script lang="ts">
  import CopyButton from '$lib/components/ui/buttons/CopyButton.svelte';

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
  }

  let { label, value, tone = 'normal', placeholder = '' }: Props = $props();

  const empty = $derived(value === '');
</script>

<div class="flex flex-col gap-2">
  <span class="text-xs font-medium tracking-wide text-base-content/50">{label}</span>
  <div class="value-box relative">
    <pre
      class="overflow-x-auto rounded-lg bg-base-100 px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap {empty
        ? 'text-base-content/50 italic'
        : tone === 'error'
          ? 'text-error'
          : 'text-base-content'}">{empty ? placeholder : value}</pre>
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
