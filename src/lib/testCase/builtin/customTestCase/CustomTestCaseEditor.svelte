<script lang="ts">
  import CodeEditor from '$lib/components/editor/CodeEditor.svelte';
  import type { CustomTestCase } from './customTestCase.svelte';

  let { testCase }: { testCase: CustomTestCase } = $props();
</script>

<div class="flex flex-col gap-2">
  <label for="testcase__{testCase.model.id}__code">Test Code:</label>
  <CodeEditor
    bind:code={testCase.data.test_code}
    language="c"
    class="min-h-64"
  />
  <p>Return 0 if success, nonzero if fail</p>
</div>
