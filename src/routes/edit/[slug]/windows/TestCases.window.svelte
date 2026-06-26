<script lang="ts">
  import { Popover } from 'bits-ui';
  import { createTestCase, deleteTestCase } from '../api';
  import type { ProblemEditorWindowContext } from '../context.svelte';
  import TestCase from './TestCases/TestCase.svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import type { ProblemTestCaseType } from '$lib/zenstack/models';

  let { context }: { context: ProblemEditorWindowContext } = $props();

  let deletesDisabled: Record<string, boolean> = $state({});
  let disableAddTestCase: boolean = $state(false);

  function onDelete(id: string) {
    deletesDisabled[id] = true;
    deleteTestCase(id)
      .then(() => {
        context.testCases = context.testCases.filter((tc) => tc.id !== id);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        delete deletesDisabled[id];
      });
  }

  function addTestCase(type: ProblemTestCaseType) {
    return async () => {
      disableAddTestCase = true;
      try {
        const testCase = await createTestCase(context.problem.id, type);
        if (testCase) {
          context.testCases.push(testCase);
          context.testCases = context.testCases;
        }
      } catch (error) {
        console.error(error);
      } finally {
        disableAddTestCase = false;
      }
    };
  }
</script>

<div class="flex flex-col gap-2 overflow-scroll h-full">
  {#each context.testCases as testCase, i (testCase.id)}
    <TestCase
      bind:testCase={context.testCases[i]}
      order={i}
      onDelete={() => onDelete(testCase.id)}
      deleteDisabled={!!deletesDisabled[testCase.id]}
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
          <Button
            onclick={addTestCase('FunctionOutputTestCase')}
            disabled={disableAddTestCase}
            class="btn-success btn-sm"
          >
            Function Output Test Case
          </Button>
          <Button
            onclick={addTestCase('ProgramIOTestCase')}
            disabled={disableAddTestCase}
            class="btn-success btn-sm"
          >
            Program I/O Test Case
          </Button>
          <Button
            onclick={addTestCase('CustomTestCase')}
            disabled={disableAddTestCase}
            class="btn-success btn-sm"
          >
            Custom Test Case
          </Button>
        </div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
</div>
