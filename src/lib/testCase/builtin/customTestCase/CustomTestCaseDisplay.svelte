<script lang="ts">
  import type { TestCaseResult } from '$lib/testCase/types';
  import type { CustomTestCaseRunInfo } from './customTestCase.svelte';
  import ValueField from '../shared/ValueField.svelte';
  import HiddenTestCase from '../shared/HiddenTestCase.svelte';

  let { testCaseResult }: { testCaseResult: TestCaseResult<CustomTestCaseRunInfo> } = $props();

  function testCode(testCaseResult: TestCaseResult<CustomTestCaseRunInfo>): string {
    if (!('runInfo' in testCaseResult)) return '';
    const data = testCaseResult.testCaseInfo.data as { test_code?: string } | null;
    return data?.test_code ?? '';
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
      label="Test code"
      value={testCode(testCaseResult)}
      placeholder="(no test code)"
    />
    <ValueField
      label="Exit code"
      value={String(testCaseResult.runInfo.exitCode)}
    />
    <ValueField
      label="Stderr"
      value={testCaseResult.runInfo.stderr}
      placeholder="(no stderr)"
      tone="error"
    />
  </div>
{:else}
  <HiddenTestCase />
{/if}
