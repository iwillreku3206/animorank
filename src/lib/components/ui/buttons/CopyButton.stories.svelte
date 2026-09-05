<script
  module
  lang="ts"
>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CopyButton from './CopyButton.svelte';

  const { Story } = defineMeta({
    title: 'UI/Copy Button',
    component: CopyButton
  });
</script>

<Story
  name="Default"
  args={{ value: 'hello world', label: 'the sample text' }}
/>

<Story name="On a Value Box">
  {#snippet template()}
    <!-- The context it was built for: pinned to the corner of a mono box. -->
    <div class="bg-base-300 w-full rounded-lg p-4">
      <div class="relative">
        <pre
          class="overflow-x-auto rounded-lg border border-base-content/10 bg-base-100 py-2 pr-9 pl-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-base-content/85">1 2 3
4 5 6</pre>
        <div class="absolute top-1 right-1">
          <CopyButton
            value={'1 2 3\n4 5 6'}
            label="the output"
          />
        </div>
      </div>
    </div>
  {/snippet}
</Story>
