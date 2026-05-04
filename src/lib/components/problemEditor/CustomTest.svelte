<script lang="ts">
  import type { CustomTestCase } from '$lib/zenstack/models';
  import CodeEditor from '$lib/components/CodeEditor.svelte';

  let { testCase = $bindable() }: { testCase: CustomTestCase } = $props();
</script>

{#if testCase.type == 'CustomTestCase'}
  <div class="flex flex-col gap-2">
    <label for="testcase__{testCase.id}__input">Test Code:</label>
    <CodeEditor
      bind:code={testCase.test_code}
      language="c"
      class="min-h-64"
    />
    <p>Return 0 if success, nonzero if fail</p>
  </div>
{/if}
