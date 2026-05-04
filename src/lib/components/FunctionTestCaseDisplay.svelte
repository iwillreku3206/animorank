<script lang="ts">
  import { ClientServiceProvider } from '$lib/services/clientServiceProvider';
  import { TypeRegistry } from '$lib/testCase/typeRegistry';
  import type { TestCaseResult } from '$lib/types/codeExecution';
  import type { FunctionOutputTestCase, Parameter } from '$lib/zenstack/models';

  interface Props {
    tests: TestCaseResult[];
  }

  let { tests }: Props = $props();

  function formatParameters(params: Parameter[] | undefined): string {
    const typeRegistry = ClientServiceProvider.instance().getService(TypeRegistry);
    if (!params || params.length === 0) return '';
    return params
      .map((p) =>
        typeRegistry.getInstance(p.type, p.data).getLanguage('c').constructTypeExpression()
      )
      .join(', ');
  }
</script>

{#each tests as test}
  <div class="border-b border-gray-700 p-3">
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-medium">Function Test</span>
      <span class="text-xs {test.success ? 'text-green-400' : 'text-red-400'}"
        >{test.success ? 'Passed' : 'Failed'}</span
      >
    </div>
    <div class="text-xs text-gray-400 mb-1">
      <span class="text-gray-500">Function:</span>
      {(test.test_info as FunctionOutputTestCase).function_name}({formatParameters(
        (test.test_info as FunctionOutputTestCase).parameters
      )})
    </div>
    <div class="text-xs text-gray-400 mb-1">
      <span class="text-gray-500">Expected:</span>
      {test.run_info?.expected}
    </div>
    <div class="text-xs {test.success ? 'text-green-300' : 'text-red-300'} mb-1">
      <span class="text-gray-500">Actual:</span>
      {test.run_info?.actual}
    </div>
    {#if !test.success && test.error_reason?.type === 'runtime_error'}
      <div class="text-xs text-red-300">Runtime Error</div>
    {/if}
    {#if !test.success && test.error_reason?.type === 'compile_error'}
      <div class="text-xs text-red-300">Compile Error: {test.error_reason.error}</div>
    {/if}
  </div>
{/each}
