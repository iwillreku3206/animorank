<script lang="ts">
  import { ClientServiceProvider } from '$lib/services/clientServiceProvider';
  import { TypeRegistry } from '$lib/testCase/typeRegistry';
  import type { TestCaseResult } from '$lib/types/codeExecution';
  import type { FunctionOutputTestCase, Parameter } from '$lib/zenstack/models';

  interface Props {
    tests: TestCaseResult[];
  }

  let { tests }: Props = $props();

  interface Failure {
    success: boolean;
    error_reason?: { type: string; error?: string };
  }

  function isHidden(test: TestCaseResult): boolean {
    return test.test_info != null && !test.test_info.public;
  }

  function formatParameters(params: Parameter[] | undefined): string {
    const typeRegistry = ClientServiceProvider.instance().getService(TypeRegistry);
    if (!params || params.length === 0) return '';
    return params
      .map((p) =>
        typeRegistry.getInstance(p.type, p.data).getLanguage('c').constructTypeExpression()
      )
      .join(', ');
  }

  function failReasonText(test: TestCaseResult): string {
    const failure = test as Failure;
    const reason = failure.error_reason;
    if (reason?.type === 'compile_error') return `Compilation Error: ${reason.error ?? ''}`;
    if (reason?.type === 'runtime_error') return 'Runtime Error';
    if (reason?.type === 'unknown_error') return 'Unknown Error';
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

{#each sortedTests as test}
  <div class="border-b border-gray-700 p-3">
    <!-- Status header -->
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-medium">
        {#if isHidden(test)}
          <span class="text-gray-400">Hidden Function Test</span>
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
    {#if !test.success && (test as Failure).error_reason?.type === 'compile_error'}
      <div class="mb-2">
        <div class="text-xs font-medium text-red-400 mb-1">Compilation Error</div>
        <pre class="text-xs text-red-300 bg-[#2d1a1a] rounded p-2 overflow-x-auto">
{(test as Failure).error_reason.error}
        </pre>
      </div>
    {/if}

    <!-- Runtime error: show detailed info -->
    {#if !test.success && (test as Failure).error_reason?.type === 'runtime_error'}
      <div class="text-xs text-red-300 mb-1">Runtime Error</div>
    {/if}

    <!-- Wrong answer / success: show function info and expected vs actual -->
    <div class="text-xs text-gray-400 mb-1">
      <span class="text-gray-500">Function:</span>
      {(test.test_info as FunctionOutputTestCase).function_name}({formatParameters(
        (test.test_info as FunctionOutputTestCase).parameters
      )})
    </div>
    {#if test.run_info}
      <div class="text-xs text-gray-400 mb-1">
        <span class="text-gray-500">Expected:</span>
        {test.run_info.expected}
      </div>
      <div
        class="text-xs mb-1"
        class:text-green-300={test.success}
        class:text-red-300={!test.success}
      >
        <span class="text-gray-500">Actual:</span>
        {test.run_info.actual}
      </div>
    {/if}
  </div>
{/each}
