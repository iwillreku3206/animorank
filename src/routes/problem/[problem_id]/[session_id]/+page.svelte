<script lang="ts">
  import TestCaseDisplay from './TestCaseDisplay.svelte';
  import { Pane, Splitpanes } from 'svelte-splitpanes';
  import type { PageProps } from './$types';
  import transform from '@diplodoc/transform';
  import YfmStaticView from '$lib/components/content/YfmStaticView.svelte';
  import { transform as latex } from '@diplodoc/latex-extension/plugin';
  import { transform as mermaid } from '@diplodoc/mermaid-extension/plugin';
  import { transform as transformHTML } from '@diplodoc/html-extension';
  import { browser } from '$app/environment';
  import { onMount, untrack } from 'svelte';
  import { runTestCases, submit, type TestRunResponse } from './api';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import Badge from '$lib/components/ui/badges/Badge.svelte';
  import { Subscribable } from '$lib/utils/subscription';
  import type { ExecutionEvent } from '$lib/testCase/executionHook';
  import { ClientServiceProvider } from '$lib/services/clientServiceProvider';
  import { TelemetryService } from '$lib/telemetry/telemetryService';
  import { AutoSave } from '$lib/utils/autosave.svelte.ts';
  import { createHotkey } from '@tanstack/svelte-hotkeys';
  import defaultPlugins from '@diplodoc/transform/lib/plugins';
  import { Problem } from '$lib/problem';
  import { ClientPracticeSession } from '$lib/practiceSession/clientPracticeSession';
  import StudentCodeEditor from './StudentCodeEditor.svelte';
  import DesktopOnly from '$lib/components/layout/DesktopOnly.svelte';

  if (browser) {
    import('@diplodoc/latex-extension/runtime');
  }

  let { data }: PageProps = $props();
  let problem = $derived(new Problem(data.problem));
  // svelte-ignore state_referenced_locally
  let practiceSession = new ClientPracticeSession(data.practiceSession, problem, data.user);

  let handleReset = $state(() => {});

  let toggleTestResults = $state(false);
  let testSubmitted = $state(false);

  let testCaseResults = $state<TestRunResponse>({ results: [] });
  let testPassed = $derived(testCaseResults.results.filter((x) => x.success));
  let testFailed = $derived(testCaseResults.results.filter((x) => !x.success));

  let disableEdit = $state(false);

  let executionObservable = new Subscribable<ExecutionEvent>();
  let selectedTest = $state(-1);

  let lastTestType: 'run' | 'submit' = $state('run');

  let codeSections: Record<string, string> = $state(
    Object.fromEntries(
      practiceSession.previousCode.sections.map((section) => [section.slot.label, section.code])
    )
  );

  // svelte-ignore state_referenced_locally
  let autosave = $state(new AutoSave(saveCode, $state.snapshot(codeSections)));

  onMount(() => {
    const telemetry = ClientServiceProvider.instance().getService(TelemetryService);
    telemetry.attachExecution(executionObservable);

    // Warn before unloading if there are unsaved changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (untrack(() => autosave.state) !== 'saved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  });

  createHotkey('Control+S', () => autosave.forceSave($state.snapshot(codeSections)));

  async function saveCode() {
    await fetch(`/api/practice-session/${practiceSession.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        code: $state.snapshot(codeSections)
      }),
      headers: { 'content-type': 'application/json' }
    });
  }

  $effect(() => {
    $state.snapshot(codeSections);
    untrack(() => autosave).save($state.snapshot(codeSections));
  });

  const handleRun = async () => {
    disableEdit = true;
    await autosave.forceSave($state.snapshot(codeSections));
    const results = await runTestCases(page.params.session_id || '');
    executionObservable.fire('run', {
      generalTestResults: results.results.map((r) => r.success),
      publicTestResults: results.results.filter((p) => !p.hidden).map((p) => p),
      runType: 'run',
      submittedCode: practiceSession.previousCode.fullCode
    });
    testCaseResults = results as TestRunResponse;
    lastTestType = 'run';
    selectedTest = testCaseResults.results.length > 0 ? 0 : -1;
    disableEdit = false;
    toggleTestResults = true;
  };

  const handleSubmit = async () => {
    disableEdit = true;
    await autosave.forceSave($state.snapshot(codeSections));
    const results = await submit(data.practiceSession.id);
    executionObservable.fire('run', {
      generalTestResults: results.results.map((r) => r.success),
      publicTestResults: results.results.filter((p) => !p.hidden).map((p) => p),
      runType: 'submit',
      submittedCode: practiceSession.previousCode.fullCode
    });
    lastTestType = 'submit';
    testCaseResults = results;
    toggleTestResults = true;

    const allSuccess = results.results.every((x) => x.success);
    if (allSuccess) {
      testSubmitted = true;
    } else {
      selectedTest = testCaseResults.results.length > 0 ? 0 : -1;
      disableEdit = false;
    }
  };

  const handleReturn = () => {
    const problemSetId = data.problem.problem_set_id;
    if (problemSetId) {
      goto(`/problemSets/${problemSetId}`);
    } else {
      goto(`/problemSets`);
    }
  };
</script>

<DesktopOnly
  action="practice"
  backHref={data.problem.problem_set_id
    ? `/problemSets/${data.problem.problem_set_id}`
    : '/problemSets'}
>
  <div class="splitpanes-nobg">
    <Splitpanes
      class="overflow-hidden"
      style="height: calc(100vh - 5rem)"
    >
      <Pane
        class="pl-5 pb-10 pt-5 pr-3 overflow-scroll h-full"
        minSize={25}
      >
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
                }),
                ...defaultPlugins
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
                  {#if autosave.state === 'error'}
                    <span class="text-red-500 text-sm">Save failed</span>
                  {:else if testSubmitted}
                    <span class="text-success text-sm">All tests passed!</span>
                  {:else if autosave.state === 'saving'}
                    <span class="text-yellow-500 text-sm">Saving...</span>
                  {:else if autosave.state === 'hold'}
                    <span class="text-gray-400 text-sm">Unsaved changes</span>
                  {:else}
                    <span class="text-green-500 text-sm">Saved</span>
                  {/if}
                </div>
                <div class="flex flex-row gap-2 ml-auto">
                  <Button
                    class="btn-sm"
                    onclick={() => (toggleTestResults = !toggleTestResults)}
                  >
                    {toggleTestResults ? 'Hide' : 'Show'} Test Results
                    {#if testPassed.length > 0 || testFailed.length > 0}
                      <Badge
                        class="badge-sm {testFailed.length > 0 ? 'badge-error' : 'badge-success'}"
                      >
                        {testPassed.length + testFailed.length}
                      </Badge>
                    {/if}
                  </Button>
                  <Button
                    class="btn-sm"
                    onclick={() =>
                      confirm('Reset code? This action cannot be undone.') && handleReset()}
                    >Reset Code</Button
                  >
                  <Button
                    class="btn-sm"
                    onclick={handleRun}
                    disabled={disableEdit}>Run</Button
                  >
                  <Button
                    class="btn-sm"
                    onclick={handleSubmit}
                    disabled={disableEdit}>Submit</Button
                  >
                </div>
              </div>

              <StudentCodeEditor
                bind:locked={disableEdit}
                language={data.problem.language.toLowerCase()}
                bind:codeSections
                useSlots={problem.uses_slots}
                registerReset={(cb) => (handleReset = cb)}
                {problem}
                {practiceSession}
              />
            </div>
          </Pane>
          {#if toggleTestResults}
            <Pane minSize={20}>
              <TestCaseDisplay
                tests={testCaseResults}
                bind:selectedTest
                {toggleTestResults}
                {testSubmitted}
                {handleReturn}
                {lastTestType}
              />
            </Pane>
          {/if}
        </Splitpanes>
      </Pane>
    </Splitpanes>
  </div>
</DesktopOnly>
