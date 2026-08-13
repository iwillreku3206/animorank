<script lang="ts">
  import { Popover } from 'bits-ui';
  import { createTestCase, deleteTestCase } from '../api';
  import type { ProblemEditorWindowContext } from '../context.svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import EyeIcon from '@iconify-svelte/fa6-solid/eye';
  import EyeSlashIcon from '@iconify-svelte/fa6-solid/eye-slash';
  import deleteIcon from '$lib/assets/delete.svg';
  import type { TestCase } from '$lib/testCase/testCase.svelte';
  import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
  import TestCaseEditorMount from './TestCases/TestCaseEditorMount.svelte';

  let { context }: { context: ProblemEditorWindowContext } = $props();

  let deletesDisabled: Record<string, boolean> = $state({});
  let disableAddTestCase: boolean = $state(false);

  function onDelete(id: string) {
    deletesDisabled[id] = true;
    deleteTestCase(id)
      .then(() => {
        context.testCases = context.testCases.filter((tc) => tc.model.id !== id);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        delete deletesDisabled[id];
      });
  }

  function toggleVisibility(testCase: TestCase) {
    testCase.model.public = !testCase.model.public;
    context.testCases = context.testCases;
  }

  async function addTestCase(type: string) {
    disableAddTestCase = true;
    try {
      const model = await createTestCase(context.problem.model.id, type);
      if (model) {
        const instance = TestCaseRegistry.instance().getInstance(model.type, model, context.problem);
        context.testCases = [...context.testCases, instance];
      }
    } catch (error) {
      console.error(error);
    } finally {
      disableAddTestCase = false;
    }
  }

  let availableTypes = $derived(TestCaseRegistry.instance().keys());
</script>

<div class="flex flex-col gap-2 overflow-scroll h-full">
  {context.testCases.length}
  {#each context.testCases as testCase, i (testCase.model.id)}
    <div class="w-full bg-[#212121] rounded-lg p-4">
      <div class="flex flex-col">
        <div class="flex flex-row gap-2 items-center mb-2">
          Test Case #{i}: {testCase.model.type}
          <div class="ml-auto flex gap-1">
            <Button
              title={testCase.model.public ? 'Hide Test Case' : 'Show Test Case'}
              class="btn-xs btn-ghost"
              onclick={() => toggleVisibility(testCase)}
            >
              {#if testCase.model.public}
                <EyeIcon class="h-4 w-4" />
              {:else}
                <EyeSlashIcon class="h-4 w-4" />
              {/if}
            </Button>
            <Button
              title="Delete Test Case"
              class="btn-xs btn-ghost"
              onclick={() => onDelete(testCase.model.id)}
              disabled={!!deletesDisabled[testCase.model.id]}
            >
              <img
                src={deleteIcon}
                alt="Delete Icon"
                class={`${!deletesDisabled[testCase.model.id] ? 'red-svg' : 'disabled-svg'} h-full w-full`}
              />
            </Button>
          </div>
        </div>
        <TestCaseEditorMount {testCase} />
      </div>
    </div>
  {/each}

  <Popover.Root>
    <Popover.Trigger class="btn btn-succcess">Add Test Case</Popover.Trigger>
    <Popover.Portal>
      <Popover.Overlay />
      <Popover.Content>
        <Popover.Close />
        <Popover.Arrow />
        <div class="bg-neutral-800 rounded-lg flex flex-col gap-2 p-4">
          {#each availableTypes as type}
            <Button
              onclick={() => addTestCase(type)}
              disabled={disableAddTestCase}
              class="btn-success btn-sm"
            >
              {type} Test Case
            </Button>
          {/each}
        </div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
</div>

<style>
  .red-svg {
    filter: brightness(0) saturate(100%) invert(17%) sepia(80%) saturate(5957%) hue-rotate(6deg) brightness(107%)
      contrast(134%);
  }

  .disabled-svg {
    filter: brightness(0) saturate(100%) invert(25%) sepia(7%) saturate(0%) hue-rotate(158deg) brightness(92%)
      contrast(87%);
  }
</style>
