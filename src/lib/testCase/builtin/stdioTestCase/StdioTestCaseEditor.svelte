<script lang="ts">
  import Radio from '$lib/components/ui/radios/Radio.svelte';
  import Textarea from '$lib/components/ui/textareas/Textarea.svelte';
  import { WhitespaceModeOptions, type StdioTestCase } from './stdioTestCase.svelte';

  let { testCase }: { testCase: StdioTestCase } = $props();
</script>

<div class="flex flex-col gap-2">
  <label for="testcase__{testCase.model.id}__input">Input:</label>
  <!-- `min-h-32` rather than `rows`: daisyUI floors the field at `min-height: 5rem`,
       so a small `rows` count is silently ignored. -->
  <Textarea
    id="testcase__{testCase.model.id}__input"
    class="min-h-32 w-full font-mono"
    bind:value={testCase.data.input}
  />

  <label for="testcase__{testCase.model.id}__output">Expected Output:</label>
  <Textarea
    id="testcase__{testCase.model.id}__output"
    class="min-h-32 w-full font-mono"
    bind:value={testCase.data.output}
  />

  <!-- A radio group rather than a select: three options whose wording is the
       whole explanation, so hiding two of them behind a click would hide what
       the setting does. The options run from strict to most forgiving. -->
  <fieldset class="flex flex-col gap-1">
    <legend>Whitespace comparison:</legend>
    {#each WhitespaceModeOptions as option (option.value)}
      <Radio
        class="radio-xs radio-primary"
        name="testcase__{testCase.model.id}__whitespace"
        value={option.value}
        bind:group={testCase.data.whitespace}
        labelClass="py-1">{option.label}</Radio
      >
    {/each}
  </fieldset>
</div>
