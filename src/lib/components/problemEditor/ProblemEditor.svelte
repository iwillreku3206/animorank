<script lang="ts">
  import type { Problem, ProblemTestCase, ProblemTestCaseType } from '$lib/zenstack/models';
  import Editor from '../Editor.svelte';
  import { Pane, Splitpanes } from 'svelte-splitpanes';
  import TestCase from './TestCase.svelte';
  import { createTestCase, deleteTestCase, updateProblem, updateTestCase } from './api';
  import CodeEditor from '../CodeEditor.svelte';
  import { Popover } from 'bits-ui';
  import { untrack } from 'svelte';
  import deepEqual from 'deep-equal';

  let {
    problem = $bindable(),
    testCases = $bindable()
  }: { problem: Problem; testCases: ProblemTestCase[] } = $props();

  let disableAddTestCase = $state(false);
  let disableDeleteTestCaseIndices = $state<Record<string, true | undefined>>({}); // hashmap for performance

  let problemSerialized = $derived(JSON.stringify(problem));
  let testCasesSerialized = $derived(JSON.stringify(testCases));

  let currentTimeout = $state<NodeJS.Timeout | undefined>(undefined);

  let lastSavedProblem = $state(problem);
  let lastSavedTestCases = $state(testCases);

  let ongoingSave = $derived(!!currentTimeout);
  let saveLock = $state(false);
  let changesAfterLock = $state(false);
  let saveHasError = $state(false);

  function checkChangesAndUpdate() {
    if (saveLock) return;
    saveLock = true;
    ongoingSave = true;
    // check what changed first
    const problemUpdated = deepEqual(problem, lastSavedProblem, { strict: true });
    const problemToSave = structuredClone($state.snapshot(problem));
    lastSavedProblem = structuredClone($state.snapshot(problem));

    const lastTestCaseMap: Record<string, ProblemTestCase> = {};
    lastSavedTestCases.forEach((testCase) => (lastTestCaseMap[testCase.id] = testCase));

    const testCaseMap: Record<string, ProblemTestCase> = {};
    testCases.forEach((testCase) => (testCaseMap[testCase.id] = testCase));

    const testCasesUpdated = [];
    testCases.forEach((testCase) => {
      if (!(testCase.id in lastTestCaseMap)) {
        testCasesUpdated.push(testCase.id);
      }

      if (!deepEqual(testCase, lastTestCaseMap[testCase.id], { strict: true })) {
        testCasesUpdated.push(testCase.id);
      }
    });

    // @ts-ignore
    lastSavedTestCases = structuredClone($state.snapshot(testCases));
    const testCasesToSave = structuredClone($state.snapshot(testCases));

    if (!problemUpdated && testCasesUpdated.length == 0) {
      saveLock = false;
    }

    // persist to db
    const promises: Promise<boolean>[] = [];
    promises.push(updateProblem($state.snapshot(problemToSave)));

    testCasesToSave.forEach((testCase) => {
      promises.push(updateTestCase(testCase));
    });

    Promise.all(promises).then((values) => {
      saveHasError = values.reduce((p, n) => p || !n, false);
      saveLock = false;
      currentTimeout = undefined;

      if (changesAfterLock) {
        changesAfterLock = false;
        checkChangesAndUpdate();
      }
    });
  }

  $effect(() => {
    // track these two objects
    problemSerialized;
    testCasesSerialized;

    if (untrack(() => saveLock)) {
      changesAfterLock = true;
      return;
    }

    clearTimeout(untrack(() => currentTimeout));
    currentTimeout = setTimeout(
      untrack(() => checkChangesAndUpdate),
      3000
    );
  });

  function addTestCase(type: ProblemTestCaseType) {
    return async () => {
      disableAddTestCase = true;
      try {
        const testCase = await createTestCase(problem.id, type);
        if (testCase) {
          testCases.push(testCase);
          testCases = testCases;
        }
      } catch (error) {
        console.error(error);
      } finally {
        disableAddTestCase = false;
      }
    };
  }

  function deleteTestCaseHandler(id: string) {
    return async () => {
      disableDeleteTestCaseIndices[id] = true;
      try {
        const success = await deleteTestCase(id);
        if (success) {
          testCases = testCases.filter((testCase) => testCase.id !== id);
        }
      } catch (error) {
        console.error(error);
      } finally {
        disableDeleteTestCaseIndices[id] = undefined;
      }
    };
  }
</script>

<div class="splitpanes-nobg h-full">
  {JSON.stringify({ ongoingSave, saveLock, changesAfterLock, saveHasError })}
  <Splitpanes
    class="overflow-auto"
    style="height: calc(100vh - 4rem)"
  >
    <Pane class="pl-5 pb-10 pt-5 pr-3 overflow-scroll h-full">
      <div class="w-9/10 m-auto">
        <h2 class="text-2xl mb-3">Problem Title</h2>
        <input
          type="text"
          class="input input-bordered w-full bg-inherit"
          placeholder="Problem Title"
          bind:value={problem.name}
        />
      </div>

      <div class="w-9/10 m-auto mt-10">
        <h2 class="text-2xl mb-3">Edit Problem Description</h2>
        <div class="m-auto">
          <Editor bind:text={problem.description} />
        </div>
      </div>

      <div class="w-9/10 m-auto mt-10">
        <h2 class="text-2xl mb-3">Edit Starter Code</h2>
        <div class="m-auto">
          <CodeEditor
            class="min-h-[300px]"
            bind:code={problem.starter_code}
            language="c"
          />
        </div>
      </div>
    </Pane>
    <Pane class="pb-10 pt-5 pl-5 pr-3">
      <h2 class="text-2xl mb-6">Test Cases</h2>
      <div class="flex flex-col gap-4">
        {#each testCases as testCase, index}
          <TestCase
            bind:testCase={testCases[index]}
            order={index + 1}
            deleteDisabled={disableDeleteTestCaseIndices[testCase.id] === true}
            onDelete={deleteTestCaseHandler(testCase.id)}
          />
        {/each}

        <Popover.Root>
          <Popover.Trigger class="btn btn-succcess">Add Test Case</Popover.Trigger>
          <Popover.Portal>
            <Popover.Overlay />
            <Popover.Content>
              <Popover.Close />
              <Popover.Arrow />
              <div class="bg-neutral-800 rounded-lg flex flex-col gap-2 p-4">
                <button
                  onclick={addTestCase('FunctionOutputTestCase')}
                  disabled={disableAddTestCase}
                  class="btn btn-success btn-sm"
                >
                  Function Output Test Case
                </button>
                <button
                  onclick={addTestCase('ProgramIOTestCase')}
                  disabled={disableAddTestCase}
                  class="btn btn-success btn-sm"
                >
                  Program I/O Test Case
                </button>
                <button
                  onclick={addTestCase('CustomTestCase')}
                  disabled={disableAddTestCase}
                  class="btn btn-success btn-sm"
                >
                  Custom Test Case
                </button>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </Pane>
  </Splitpanes>
</div>
