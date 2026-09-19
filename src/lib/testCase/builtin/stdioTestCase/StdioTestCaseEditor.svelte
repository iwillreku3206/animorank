<script lang="ts">
  import Radio from '$lib/components/ui/radios/Radio.svelte';
  import { WhitespaceModeOptions, type StdioTestCase } from './stdioTestCase.svelte';

  let { testCase }: { testCase: StdioTestCase } = $props();
</script>

<div class="flex flex-col gap-2">
  <label for="testcase__{testCase.model.id}__input">Input:</label>
  <textarea
    id="testcase__{testCase.model.id}__input"
    class="textarea font-mono textarea-bordered textarea-primary w-full"
    bind:value={testCase.data.input}
  ></textarea>

  <label for="testcase__{testCase.model.id}__output">Expected Output:</label>
  <textarea
    id="testcase__{testCase.model.id}__output"
    class="textarea font-mono textarea-bordered textarea-primary w-full"
    bind:value={testCase.data.output}
  ></textarea>

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
