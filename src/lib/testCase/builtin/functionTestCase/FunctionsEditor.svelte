<script lang="ts">
  import { getProblemEditorContext } from '../../../../routes/edit/[slug]/context.svelte';
  import type { Function as FuncDef } from './types';
  import { FunctionTestCase } from './functionTestCase.svelte';
  import { Integer } from './types/int';
  import TypeEditor from './TypeEditor.svelte';
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import { GlobalRegistryProvider } from '$lib/registry/global';
  import { TypeRegistry } from './typeRegistry';

  const context = getProblemEditorContext();
  const data = $derived(context.functionData);

  const typeRegistry = GlobalRegistryProvider.instance().getRegistry(TypeRegistry);
  const availableTypes = $derived([...typeRegistry.keys()]);

  function addParameter(fn: FuncDef) {
    // Default the type immediately: an untyped parameter persisted to
    // extension_data crashed test-case hydration (the constructor and
    // selectFunction used to deref `type!`). The author changes it via the
    // TypeEditor dropdown, which never clears back to null.
    fn.parameters = [...(fn.parameters ?? []), { id: crypto.randomUUID(), name: '', type: Integer.create() }];
  }

  function removeParameter(fn: FuncDef, index: number) {
    fn.parameters = fn.parameters.filter((_, i) => i !== index);
  }

  function addReturnType(fn: FuncDef) {
    fn.returnType = [...(fn.returnType ?? []), null];
  }

  function removeReturnType(fn: FuncDef, index: number) {
    fn.returnType = fn.returnType.filter((_, i) => i !== index);
  }
</script>

<section class="flex flex-col gap-4 p-4 overflow-y-auto h-full">
  <div class="flex items-center justify-between">
    <h2 class="text-lg font-bold">Functions</h2>
    <Button
      class="btn-primary btn-xs"
      onclick={() => context.addFunction()}>Add Function</Button
    >
  </div>

  {#if Object.keys(data.functions).length === 0}
    <p class="text-base-content/50 text-sm">
      No functions defined. Click "Add Function" to define function signatures for test cases.
    </p>
  {/if}

  {#each Object.entries(data.functions) as [id, fn] (id)}
    {@const referencing = context.testCases.filter(
      (tc) => tc instanceof FunctionTestCase && tc.data.function === id
    ).length}
    <details
      class="bg-base-300 border border-base-100 rounded"
      open
    >
      <summary class="font-medium p-3 cursor-pointer select-none">
        {fn.name || 'Unnamed function'}
      </summary>
      <div class="flex flex-col gap-3 py-2 px-3">
        <!-- Name -->
        <label class="form-control w-full">
          <span class="label-text text-xs font-medium pb-1">Name</span>
          <TextInput
            class="input-xs input-primary w-full"
            placeholder="e.g. add"
            bind:value={fn.name}
          />
        </label>

        <!-- Symbol -->
        <label class="form-control w-full">
          <span class="label-text text-xs font-medium pb-1">Symbol (optional)</span>
          <TextInput
            class="input-xs input-primary w-full"
            placeholder="e.g. add"
            bind:value={fn.symbol}
          />
        </label>

        <!-- Parameters -->
        <fieldset class="flex flex-col gap-2">
          <legend class="text-xs font-medium pb-1">Parameters</legend>
          {#each fn.parameters as param, i (i)}
            <div class="flex items-center gap-2">
              <TextInput
                class="input-xs input-primary flex-1"
                placeholder="param name"
                bind:value={param.name}
              />

              <TypeEditor
                bind:type={fn.parameters[i].type}
                {availableTypes}
              />
              <Button
                class="btn-xs btn-ghost btn-square text-error"
                onclick={() => removeParameter(fn, i)}
              >
                &times;
              </Button>
            </div>
          {/each}
          <Button
            onclick={() => addParameter(fn)}
            class="btn-xs btn-ghost"
          >
            + Add parameter
          </Button>
        </fieldset>

        <!-- Return Types -->
        <fieldset class="flex flex-col gap-2">
          <legend class="text-xs font-medium pb-1">Return Types</legend>
          {#each fn.returnType as _rt, i (i)}
            <div class="flex items-center gap-2">
              <TypeEditor
                bind:type={fn.returnType[i]}
                {availableTypes}
                dropdownAlign="start"
              />
              <Button
                class="btn-xs btn-ghost btn-square text-error"
                onclick={() => removeReturnType(fn, i)}
              >
                &times;
              </Button>
            </div>
          {/each}
          <Button
            onclick={() => addReturnType(fn)}
            class="btn-xs btn-ghost"
          >
            + Add return type
          </Button>
        </fieldset>

        <!-- Remove function -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-base-300">
          {#if referencing > 0}
            <span class="text-error text-xs">
              Referenced by {referencing} test case{referencing === 1 ? '' : 's'} — delete
              {referencing === 1 ? 'it' : 'them'} first
            </span>
          {/if}
          <Button
            class="btn-xs btn-error btn-outline"
            disabled={referencing > 0}
            onclick={() => context.removeFunction(id)}
          >
            Remove function
          </Button>
        </div>
      </div>
    </details>
  {/each}
</section>
