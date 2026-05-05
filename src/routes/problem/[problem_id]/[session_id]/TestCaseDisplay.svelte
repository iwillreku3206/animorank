<script lang="ts">
  import type { TestRunResponse } from './api';
  import TestCaseCard from './TestCaseCard.svelte';

  interface Props {
    tests: TestRunResponse;
    toggleTestResults?: boolean;
    testSubmitted?: boolean;
    handleReturn?: () => void;
  }

  let {
    tests,
    toggleTestResults = $bindable(true),
    testSubmitted = false,
    handleReturn
  }: Props = $props();

  let selectedTest = $state(-1);

  let publicTests = $derived(tests.results.filter((x) => !x.hidden));

  $effect(() => {
    if (publicTests.length === 0) selectedTest = -1;
    else selectedTest = Math.min(publicTests.length - 1, selectedTest);
  });
</script>

{#if toggleTestResults}
  <div class="min-h-[20vh]">
    {#if testSubmitted}
      <div class="flex flex-col gap-4 items-center justify-center py-12">
        <div class="text-success text-5xl">✓</div>
        <h2 class="text-2xl font-bold text-success">All test cases passed!</h2>
        <p class="text-gray-400">Congratulations! You've solved this problem.</p>
        {#if handleReturn}
          <button
            class="btn btn-primary btn-sm"
            onclick={handleReturn}
          >
            Return to Problem Set
          </button>
        {/if}
      </div>
    {:else}
      <div class="tabs tabs-box">
        <input
          type="radio"
          name="test_case_display_tabs"
          class="tab"
          aria-label="Test Cases"
          checked={true}
        />
        <div class="tab-content">
          <div class="flex flex-row">
            <ul class="menu bg-base-200 rounded-box w-56">
              {#each publicTests as result, i (i)}
                <li class={result.success ? 'text-primary' : 'text-error'}>
                  <button onclick={() => (selectedTest = i)}>
                    Case {i + 1}
                  </button>
                </li>
              {/each}
            </ul>
            {#if tests.results.length > 0 && selectedTest in publicTests}
              <TestCaseCard result={publicTests[selectedTest]} />
            {:else}
              No test results yet. Click "Run" to run tests.
            {/if}
          </div>
        </div>

        <input
          type="radio"
          name="test_case_display_tabs"
          class="tab"
          aria-label="Hidden Test Cases"
        />
        <div class="tab-content">
          <div class="flex flex-row flex-wrap gap-2">
            {#each tests.results as result, i (i)}
              <div class=" bg-base-100 p-2 rounded-lg text-sm flex flex-row gap-4 items-center">
                <span class={result.success ? 'text-primary' : 'text-error'}>Case {i + 1}</span>
                {result.success
                  ? 'Passed'
                  : result.reason
                      .split('_')
                      .map((x) => `${x.charAt(0).toUpperCase()}${x.substring(1)}`)
                      .join(' ')}
              </div>
            {/each}
          </div>
        </div>

        <input
          type="radio"
          name="test_case_display_tabs"
          class="tab"
          aria-label="Custom Input"
        />
        <!--TODO: Implement this-->
        <div class="tab-content p-6">To be implemented...</div>
      </div>
    {/if}
  </div>
{/if}
