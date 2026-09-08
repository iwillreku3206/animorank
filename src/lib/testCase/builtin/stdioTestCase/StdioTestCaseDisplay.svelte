<script lang="ts">
  import type { TestCaseResult } from '$lib/testCase/types';
  import type { StdioTestCaseRunInfo } from './stdioTestCase.svelte';
  import ValueField from '../shared/ValueField.svelte';
  import HiddenTestCase from '../shared/HiddenTestCase.svelte';

  let { testCaseResult }: { testCaseResult: TestCaseResult<StdioTestCaseRunInfo> } = $props();

  function testInput(testCaseResult: TestCaseResult<StdioTestCaseRunInfo>): string {
    if (!('runInfo' in testCaseResult)) return '';
    const data = testCaseResult.testCaseInfo.data as { input?: string } | null;
    return data?.input ?? '';
  }
</script>

{#if 'runInfo' in testCaseResult}
  <div class="flex w-full flex-col gap-4">
    {#if testCaseResult.compilerOutput}
      <ValueField
        label="Compiler output"
        value={testCaseResult.compilerOutput}
        tone="error"
      />
    {/if}
    {#if testCaseResult.failureReason}
      <ValueField
        label="Failure reason"
        value={testCaseResult.failureReason}
        tone="error"
      />
    {/if}
    <ValueField
      label="Input"
      value={testInput(testCaseResult)}
      placeholder="(no input)"
    />
    <ValueField
      label="Expected output"
      value={testCaseResult.runInfo.expected}
      placeholder="(no output)"
    />
    <ValueField
      label="Actual output"
      value={testCaseResult.runInfo.actual}
      placeholder="(no output)"
    />
  </div>
{:else}
  <HiddenTestCase />
{/if}
