<script lang="ts">
  import type { StdioTestCase } from './stdioTestCase.svelte';

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
</div>
