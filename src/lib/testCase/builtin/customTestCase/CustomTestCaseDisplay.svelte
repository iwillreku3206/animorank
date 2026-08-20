<script lang="ts">
  import type { TestCaseResult } from '$lib/testCase/types';
  import type { CustomTestCaseRunInfo } from './customTestCase.svelte';

  let { testCaseResult }: { testCaseResult: TestCaseResult<CustomTestCaseRunInfo> } = $props();
</script>

{#if 'runInfo' in testCaseResult}
  <div class="w-full flex flex-col gap-3">
    <div class={testCaseResult.success ? 'text-success' : 'text-error'}>
      {testCaseResult.success ? '✓ Passed' : '✗ Failed'}
    </div>
    {#if testCaseResult.compilerOutput}
      <pre class="text-error text-xs bg-base-100 rounded-lg p-2 overflow-x-auto">{testCaseResult.compilerOutput}</pre>
    {/if}
    {#if !testCaseResult.success}
      <div class="bg-base-100 flex flex-col gap-2 rounded-lg p-3">
        <div class="flex flex-row items-center gap-2">
          <span class="text-xs text-base-content opacity-80">Exit code:</span>
          <span class="font-mono text-xs">{testCaseResult.runInfo.exitCode}</span>
        </div>
        {#if testCaseResult.runInfo.stderr}
          <div class="flex flex-col gap-1">
            <span class="text-xs text-base-content opacity-80">Stderr:</span>
            <pre class="font-mono text-xs whitespace-pre-wrap bg-base-200 rounded p-2 overflow-x-auto">{testCaseResult
                .runInfo.stderr}</pre>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{:else}
  <div class="p-4">Hidden test case</div>
{/if}
