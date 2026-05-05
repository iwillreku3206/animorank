<script lang="ts">
  import CodeEditor from '$lib/components/CodeEditor.svelte';
  import TestCaseDisplay from './TestCaseDisplay.svelte';
  import { Pane, Splitpanes } from 'svelte-splitpanes';
  import type { PageProps } from './$types';
  import transform from '@diplodoc/transform';
  import YfmStaticView from '$lib/components/YfmStaticView.svelte';
  import { transform as latex } from '@diplodoc/latex-extension/plugin';
  import { transform as mermaid } from '@diplodoc/mermaid-extension/plugin';
  import { transform as transformHTML } from '@diplodoc/html-extension';
  import { browser } from '$app/environment';
  import { untrack } from 'svelte';
  import deepEqual from 'deep-equal';
  import { runTestCases, type TestRunResponse } from './api';
  import { page } from '$app/state';
  import type { TestCaseResult } from '$lib/types/codeExecution';

  if (browser) {
    import('@diplodoc/latex-extension/runtime');
  }

  let { data }: PageProps = $props();

  let code = $state(data.practiceSession.previous_code);
  const handleReset = () => {
    code = data.problem.starter_code;
  };

  let toggleTestResults = $state(false);

  let testCaseResults = $state<TestRunResponse>({ results: [] });
  let testPassed = $derived(testCaseResults.results.filter((x) => x.success));
  let testFailed = $derived(testCaseResults.results.filter((x) => !x.success));

  let currentTimeout = $state<NodeJS.Timeout | undefined>(undefined);

  let lastSavedCode = $state(data.practiceSession.previous_code);

  let ongoingSave = $derived(!!currentTimeout);
  let saveLock = $state(false);
  let changesAfterLock = $state(false);
  let saveHasError = $state(false);

  async function saveCode(codeToSave: string) {
    const res = await fetch(`/api/practice-session/${data.practiceSession.id}`, {
      method: 'PUT',
      body: JSON.stringify({ code: codeToSave }),
      headers: { 'content-type': 'application/json' }
    });

    saveHasError = !res.ok;
    saveLock = false;
    currentTimeout = undefined;

    if (changesAfterLock) {
      changesAfterLock = false;
      checkChangesAndSave();
    }
  }

  async function checkChangesAndSave() {
    if (saveLock) return;

    const codeUpdated = !deepEqual(code, lastSavedCode, { strict: true });

    if (codeUpdated) {
      saveLock = true;
      ongoingSave = true;
    }

    const codeToSave = code;
    lastSavedCode = code;

    if (!codeUpdated) {
      saveLock = false;
      return;
    }

    await saveCode(codeToSave);
  }

  $effect(() => {
    code;
    if (code == lastSavedCode) return;
    if (untrack(() => saveLock)) {
      changesAfterLock = true;
      return;
    }
    clearTimeout(untrack(() => currentTimeout));
    currentTimeout = setTimeout(
      untrack(() => checkChangesAndSave),
      3000
    );
  });

  const handleRun = async () => {
    await saveCode(code);
    const results = await runTestCases(page.params.session_id || '', code);
    testCaseResults = results as TestRunResponse;
    toggleTestResults = true;
  };
</script>

<div class="splitpanes-nobg h-full">
  <Splitpanes
    class="overflow-auto"
    style="height: calc(100vh - 4rem)"
  >
    <Pane class="pl-5 pb-10 pt-5 pr-3 overflow-scroll h-full">
      <h2 class="text-2xl">{data.problem.name}</h2>
      <div style="filter: invert(100%) hue-rotate(180deg);">
        <YfmStaticView
          html={transform(data.problem.description, {
            allowHTML: true,
            plugins: [
              latex({
                bundle: false,
                runtime: 'extension:latex'
              }),

              mermaid({
                bundle: false,
                runtime: 'extension:mermaid'
              }),

              transformHTML({
                bundle: false,
                runtimeJsPath: 'extension:html'
              })
            ]
          }).result.html}
        />
      </div>
    </Pane>
    <Pane>
      <Splitpanes horizontal={true}>
        <Pane>
          <div class="flex flex-col h-full w-full">
            <div class="flex flex-row p-2">
              <div class="flex items-center gap-2">
                {#if saveHasError}
                  <span class="text-red-500 text-sm">Save failed</span>
                {:else if ongoingSave}
                  <span class="text-yellow-500 text-sm">Saving...</span>
                {:else if !saveLock && !deepEqual(code, lastSavedCode, { strict: true })}
                  <span class="text-gray-400 text-sm">Unsaved changes</span>
                {:else}
                  <span class="text-green-500 text-sm">Saved</span>
                {/if}
              </div>
              <div class="flex flex-row gap-2 ml-auto">
                <button
                  class="btn btn-sm"
                  onclick={() => (toggleTestResults = !toggleTestResults)}
                >
                  {toggleTestResults ? 'Hide' : 'Show'} Test Results
                  {#if testPassed.length > 0 || testFailed.length > 0}
                    <span
                      class="badge badge-sm {testFailed.length > 0
                        ? 'badge-error'
                        : 'badge-success'}"
                    >
                      {testPassed.length + testFailed.length}
                    </span>
                  {/if}
                </button>
                <button
                  class="btn btn-sm"
                  onclick={handleReset}>Reset Code</button
                >
                <button
                  class="btn btn-sm"
                  onclick={handleRun}>Run</button
                >
                <button class="btn btn-sm bg-[#006239] text-white hover:bg-[#004327]">Submit</button
                >
              </div>
            </div>

            <CodeEditor
              bind:code
              language={data.problem.language.toLowerCase()}
            />
          </div>
        </Pane>
        {#if toggleTestResults}
          <Pane>
            <TestCaseDisplay
              tests={testCaseResults}
              {toggleTestResults}
            />
          </Pane>
        {/if}
      </Splitpanes>
    </Pane>
  </Splitpanes>
</div>
