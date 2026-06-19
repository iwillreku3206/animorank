<script lang="ts">
  import type { TestCaseResult } from '$lib/types/codeExecution';
  import { type ProgramIOTestCase } from '$lib/zenstack/models';

  interface Props {
    tests: TestCaseResult[];
  }

  let { tests }: Props = $props();

  function isHidden(test: TestCaseResult): boolean {
    return test.test_info != null && !test.test_info.public;
  }

  function failReasonText(test: TestCaseResult): string {
    const failure = test as { success: false; error_reason: { type: string; error?: string } };
    const reason = failure.error_reason;
    if (reason.type === 'compile_error') return `Compilation Error: ${reason.error ?? ''}`;
    if (reason.type === 'runtime_error') return 'Runtime Error';
    if (reason.type === 'unknown_error') return 'Unknown Error';
    return 'Wrong Answer';
  }

  let sortedTests = $derived(
    [...tests].sort((a, b) => {
      const aHidden = isHidden(a) ? 0 : 1;
      const bHidden = isHidden(b) ? 0 : 1;
      if (aHidden !== bHidden) return aHidden - bHidden;
      const aFailed = a.success ? 1 : 0;
      const bFailed = b.success ? 1 : 0;
      if (aFailed !== bFailed) return aFailed - bFailed;
      return 0;
    })
  );
</script>

{#each sortedTests as test, i (i)}
  <div class="border-b border-gray-700 p-3">
    <!-- Status header -->
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-medium">
        {#if isHidden(test)}
          <span class="text-gray-400">Hidden STDIO Test</span>
        {:else if test.success}
          Passed
        {:else}
          Failed
        {/if}
      </span>
      <span
        class="text-xs"
        class:text-gray-400={isHidden(test) && !test.success}
        class:text-green-400={test.success}
        class:text-red-400={!test.success && !isHidden(test)}
      >
        {#if isHidden(test)}
          {test.success ? 'Passed' : 'Failed'}
        {:else if test.success}
          Passed
        {:else}
          Failed
        {/if}
      </span>
    </div>

    <!-- Hidden test: only show pass/fail and reason if failed -->
    {#if isHidden(test) && !test.success}
      <div class="text-xs text-red-300 mb-1">{failReasonText(test)}</div>
    {/if}

    <!-- Compilation error: show detailed error -->
    {#if !test.success && (test as { success: false; error_reason: { type: string; error?: string } }).error_reason?.type === 'compile_error'}
      <div class="mb-2">
        <div class="text-xs font-medium text-red-400 mb-1">Compilation Error</div>
        <pre class="text-xs text-red-300 bg-[#2d1a1a] rounded p-2 overflow-x-auto">
{(test as { success: false; error_reason: { type: string; error?: string } }).error_reason.error}
        </pre>
      </div>
    {/if}

    <!-- Runtime error: show detailed info -->
    {#if !test.success && (test as { success: false; error_reason: { type: string } }).error_reason?.type === 'runtime_error'}
      <div class="text-xs text-red-300 mb-1">Runtime Error</div>
    {/if}

    <!-- Wrong answer / success: show input/output details -->
    {#if test.run_info}
      <div class="text-xs text-gray-400 mb-1">
        <span class="text-gray-500">Input:</span>
        {(test.test_info as ProgramIOTestCase | undefined)?.input}
      </div>
      <div class="text-xs text-gray-400 mb-1">
        <span class="text-gray-500">Expected Output:</span>
        <pre>{test.run_info.expected}</pre>
      </div>
      <div
        class="text-xs mb-1"
        class:text-green-300={test.success}
        class:text-red-300={!test.success}
      >
        <span class="text-gray-500">Actual Output:</span>
        {test.run_info.actual}
      </div>
    {/if}
  </div>
{/each}
