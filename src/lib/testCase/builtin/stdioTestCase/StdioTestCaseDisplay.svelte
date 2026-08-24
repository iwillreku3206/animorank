<script lang="ts">
  import type { TestCaseResult } from '$lib/testCase/types';
  import type { StdioTestCaseRunInfo } from './stdioTestCase.svelte';

  let { testCaseResult }: { testCaseResult: TestCaseResult<StdioTestCaseRunInfo> } = $props();

  function testInput(testCaseResult: TestCaseResult<StdioTestCaseRunInfo>): string {
    if (!('runInfo' in testCaseResult)) return '';
    const data = testCaseResult.testCaseInfo.data as { input?: string } | null;
    return data?.input ?? '';
  }
</script>

{#if 'runInfo' in testCaseResult}
  <div class="w-full flex flex-col gap-3">
    <div class={testCaseResult.success ? 'text-success' : 'text-error'}>
      {testCaseResult.success ? '✓ Passed' : '✗ Failed'}
    </div>
    {#if testCaseResult.compilerOutput}
      <pre class="text-error text-xs bg-base-100 rounded-lg p-2 overflow-x-auto">{testCaseResult.compilerOutput}</pre>
    {/if}
    {#if testCaseResult.failureReason}
      <pre class="text-error text-xs bg-base-100 rounded-lg p-2 overflow-x-auto">{testCaseResult.failureReason}</pre>
    {/if}
    <div class="bg-base-100 flex flex-col gap-2 rounded-lg p-3">
      <div class="flex flex-col gap-1">
        <span class="text-xs text-base-content opacity-80">Input:</span>
        <pre class="font-mono text-xs whitespace-pre-wrap bg-base-200 rounded p-2">{testInput(testCaseResult)}</pre>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-xs text-base-content opacity-80">Expected Output:</span>
        <pre class="font-mono text-xs whitespace-pre-wrap bg-base-200 rounded p-2">{testCaseResult.runInfo
            .expected}</pre>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-xs text-base-content opacity-80">Actual Output:</span>
        <pre class="font-mono text-xs whitespace-pre-wrap bg-base-200 rounded p-2">{testCaseResult.runInfo.actual}</pre>
      </div>
    </div>
  </div>
{:else}
  <div class="p-4">Hidden test case</div>
{/if}
