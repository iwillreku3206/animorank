<script lang="ts">
  import FunctionTestCaseDisplay from './FunctionTestCaseDisplay.svelte';
  import StdioTestCaseDisplay from './StdioTestCaseDisplay.svelte';
  import CustomTestCaseDisplay from './CustomTestCaseDisplay.svelte';
  import type { TestCaseResult } from '$lib/types/codeExecution';

  interface Props {
    tests: TestCaseResult[];
    toggleTestResults?: boolean;
  }

  let { tests, toggleTestResults = $bindable(true) }: Props = $props();

  function filterByTypeSuccess(
    tests: TestCaseResult[],
    success: boolean,
    type: string
  ): TestCaseResult[] {
    return tests.filter((t) => t.success === success && t.test_info?.type === type);
  }

  let failedFunctionTests = $derived(filterByTypeSuccess(tests, false, 'FunctionOutputTestCase'));
  let failedStdioTests = $derived(filterByTypeSuccess(tests, false, 'ProgramIOTestCase'));
  let failedCustomTests = $derived(filterByTypeSuccess(tests, false, 'CustomTestCase'));

  let passedFunctionTests = $derived(filterByTypeSuccess(tests, true, 'FunctionOutputTestCase'));
  let passedStdioTests = $derived(filterByTypeSuccess(tests, true, 'ProgramIOTestCase'));
  let passedCustomTests = $derived(filterByTypeSuccess(tests, true, 'CustomTestCase'));

  let passedTests = $derived(tests.filter((t) => t.success));
  let failedTests = $derived(tests.filter((t) => !t.success));
</script>

{#if toggleTestResults}
  <div class="min-h-[20vh]">
    <div class="h-80 overflow-y-auto border-t border-gray-700">
      <div
        class="bg-[#1e1e1e] flex flex-row items-center justify-between px-4 py-2 border-b border-gray-700"
      >
        <div class="flex gap-4">
          <span class="text-sm font-medium">Test Cases</span>
          {#if passedTests.length > 0}
            <span class="text-sm text-green-400">{passedTests.length} passed</span>
          {/if}
          {#if failedTests.length > 0}
            <span class="text-sm text-red-400">{failedTests.length} failed</span>
          {/if}
        </div>
      </div>
      <div class="p-4 space-y-4">
        {#if failedFunctionTests.length > 0}
          <div>
            <h4 class="text-sm font-medium text-red-400 mb-2">Function Tests</h4>
            <div class="bg-[#2d1a1a] rounded-lg overflow-hidden">
              <FunctionTestCaseDisplay tests={failedFunctionTests} />
            </div>
          </div>
        {/if}
        {#if failedStdioTests.length > 0}
          <div>
            <h4 class="text-sm font-medium text-red-400 mb-2">STDIO Tests</h4>
            <div class="bg-[#2d1a1a] rounded-lg overflow-hidden">
              <StdioTestCaseDisplay tests={failedStdioTests} />
            </div>
          </div>
        {/if}
        {#if failedCustomTests.length > 0}
          <div>
            <h4 class="text-sm font-medium text-red-400 mb-2">Custom Tests</h4>
            <div class="bg-[#2d1a1a] rounded-lg overflow-hidden">
              <CustomTestCaseDisplay tests={failedCustomTests} />
            </div>
          </div>
        {/if}
        {#if passedFunctionTests.length > 0}
          <div>
            <h4 class="text-sm font-medium text-green-400 mb-2">Function Tests</h4>
            <div class="bg-[#1a2d1a] rounded-lg overflow-hidden">
              <FunctionTestCaseDisplay tests={passedFunctionTests} />
            </div>
          </div>
        {/if}
        {#if passedStdioTests.length > 0}
          <div>
            <h4 class="text-sm font-medium text-green-400 mb-2">STDIO Tests</h4>
            <div class="bg-[#1a2d1a] rounded-lg overflow-hidden">
              <StdioTestCaseDisplay tests={passedStdioTests} />
            </div>
          </div>
        {/if}
        {#if passedCustomTests.length > 0}
          <div>
            <h4 class="text-sm font-medium text-green-400 mb-2">Custom Tests</h4>
            <div class="bg-[#1a2d1a] rounded-lg overflow-hidden">
              <CustomTestCaseDisplay tests={passedCustomTests} />
            </div>
          </div>
        {/if}
        {#if passedTests.length === 0 && failedTests.length === 0}
          <div class="text-sm text-gray-400">
            No test results yet. Run your code to see results.
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
