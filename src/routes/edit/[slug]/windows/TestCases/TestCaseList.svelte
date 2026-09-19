<script lang="ts">
  import { createTestCase, deleteTestCase } from '../../api';
  import type { ProblemEditorWindowContext } from '../../context.svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import EyeIcon from '@iconify-svelte/fa6-solid/eye';
  import EyeSlashIcon from '@iconify-svelte/fa6-solid/eye-slash';
  import TrashIcon from '@iconify-svelte/fa6-solid/trash';
  import type { TestCase } from '$lib/testCase/testCase.svelte';
  import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
  import TestCaseEditorMount from './TestCaseEditorMount.svelte';

  // `type` is the test case type this panel owns. Each type gets its own
  // window, so the panel never has to ask which kind to create.
  let { context, type }: { context: ProblemEditorWindowContext; type: string } = $props();

  let deletesDisabled: Record<string, boolean> = $state({});
  let disableAddTestCase: boolean = $state(false);

  const displayName = $derived(TestCaseRegistry.instance().getStatic(type).displayName);
  const testCases = $derived(context.testCases.filter((testCase) => testCase.model.type === type));

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

  async function addTestCase() {
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
</script>

<div class="flex flex-col gap-2 overflow-y-auto h-full p-2">
  {#if testCases.length === 0}
    <p class="text-base-content/50 text-sm">
      No {displayName.toLowerCase()} yet. Click "Add Test Case" to create one.
    </p>
  {/if}

  {#each testCases as testCase, i (testCase.model.id)}
    <div class="w-full bg-[#212121] rounded-lg p-4">
      <div class="flex flex-col">
        <div class="flex flex-row gap-2 items-center mb-2">
          Test Case #{i + 1}
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
              <TrashIcon
                class={`${!deletesDisabled[testCase.model.id] ? 'text-error' : 'text-base-content/40'} h-4 w-4`}
              />
            </Button>
          </div>
        </div>
        <TestCaseEditorMount {testCase} />
      </div>
    </div>
  {/each}

  <Button
    onclick={addTestCase}
    disabled={disableAddTestCase}
    class="btn-success btn-sm self-start"
  >
    Add Test Case
  </Button>
</div>
