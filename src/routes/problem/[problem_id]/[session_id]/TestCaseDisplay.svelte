<script lang="ts">
  import type { TestCaseResult } from '$lib/testCase/testCase';
  import type { TestRunResponse } from './api';
  import TestCaseCard from './TestCaseCard.svelte';

  interface Props {
    tests: TestRunResponse;
    toggleTestResults?: boolean;
  }

  let { tests, toggleTestResults = $bindable(true) }: Props = $props();

  let selectedTest = $state(0);

  let publicTests = $derived(tests.results.filter((x) => !x.hidden));
  let hiddenTests = $derived(tests.results.filter((x) => x.hidden));
</script>

{#if toggleTestResults}
  <div class="min-h-[20vh]">
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
          {#if tests.results.length > 0}
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
      <div class="tab-content p-6">tab2</div>

      <input
        type="radio"
        name="test_case_display_tabs"
        class="tab"
        aria-label="Custom Input"
      />
      <div class="tab-content p-6">tab3</div>
    </div>
  </div>
{/if}
