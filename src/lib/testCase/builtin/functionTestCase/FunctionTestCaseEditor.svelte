<script lang="ts">
  import type { FunctionTestCase } from './functionTestCase.svelte';
  import type { Symbol } from './types';
  import { OperatorRegistry } from './operatorRegistry';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import DynamicForm from '$lib/components/ui/inputs/DynamicForm.svelte';
  import GearIcon from '@iconify-svelte/fa6-solid/gear';
  import ValueEditorMount from './ValueEditorMount.svelte';

  let { testCase }: { testCase: FunctionTestCase } = $props();

  const opRegistry = OperatorRegistry.instance();

  let problemData = $derived(testCase.problem.functionData);
  let availableFunctions = $derived(Object.entries(problemData.functions).map(([id, fn]) => ({ id, name: fn.name })));
  let availableOperators = $derived([...opRegistry.keys()]);
  let operatorNames = $derived(
    Object.fromEntries(availableOperators.map((key) => [key, opRegistry.getStatic(key).create().displayName]))
  );

  let availableSymbols = $derived([
    { value: 'return' as Symbol, label: 'return' },
    ...testCase.data.parameters.map((p, i) => ({
      value: `param${i}` as Symbol,
      label: p.name || `param${i}`
    }))
  ]);
</script>

<div class="flex flex-col gap-3">
  <!-- Function selector -->
  <div class="flex flex-row gap-2 items-center">
    <label
      for="fn-select"
      class="text-sm font-medium whitespace-nowrap">Function:</label
    >
    <select
      id="fn-select"
      class="select select-xs select-bordered flex-1"
      value={testCase.data.function}
      onchange={(e) => testCase.selectFunction((e.target as HTMLSelectElement).value)}
    >
      <option value="">Select a function</option>
      {#each availableFunctions as fn (fn.id)}
        <option value={fn.id}>{fn.name || 'Unnamed function'}</option>
      {/each}
    </select>
  </div>

  <!-- Parameters -->
  {#if testCase.data.parameters.length > 0}
    <div class="flex flex-col gap-2">
      <span class="text-sm font-medium">Parameters:</span>
      {#each testCase.data.parameters as param, i (i)}
        <div class="flex flex-row gap-2 items-center bg-[#1a1a1a] rounded p-2">
          <span class="text-sm font-mono whitespace-nowrap">{param.name || `param${i}`}</span>
          <div class="flex-1">
            <ValueEditorMount
              value={param.value}
              onchange={() => testCase.setParameterValue(i, param.value)}
            />
          </div>
        </div>
      {/each}
    </div>
  {:else if testCase.data.function}
    <p class="text-gray-500 text-sm">This function has no parameters.</p>
  {/if}

  <!-- Comparisons -->
  {#if testCase.data.function}
    <div class="flex flex-col gap-2">
      <span class="text-sm font-medium">Comparisons:</span>
      {#if testCase.data.comparisons.length === 0}
        <p class="text-gray-500 text-sm">No comparisons yet. Add one below.</p>
      {/if}
      {#each testCase.data.comparisons as comp, i (i)}
        <div class="flex flex-col gap-2 bg-[#1a1a1a] rounded p-2">
          <div class="flex flex-row gap-2 items-center">
            <select
              class="select select-xs select-bordered"
              value={comp.symbol as string}
              onchange={(e) => testCase.setComparisonSymbol(i, (e.target as HTMLSelectElement).value as Symbol)}
            >
              {#each availableSymbols as sym (sym)}
                <option value={sym.value}>{sym.label}</option>
              {/each}
            </select>
            {#if availableOperators.length > 0}
              <select
                class="select select-xs select-bordered"
                value={comp.operator.id}
                onchange={(e) => testCase.setComparisonOperator(i, (e.target as HTMLSelectElement).value)}
              >
                {#each availableOperators as opKey (opKey)}
                  <option value={opKey}>{operatorNames[opKey]}</option>
                {/each}
              </select>
            {/if}
            {#if comp.operator.optionsForm !== null && comp.operator.options !== null}
              <div class="dropdown dropdown-end">
                <div
                  tabindex="0"
                  role="button"
                  class="btn btn-xs btn-ghost btn-square text-base-content/70 hover:text-base-content"
                  aria-label="Edit operator options"
                >
                  <GearIcon class="h-4 w-4" />
                </div>
                <div
                  tabindex="-1"
                  class="dropdown-content z-50 bg-base-200 border border-base-300 rounded-box p-3 shadow-lg min-w-max"
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-medium text-base-content/70">Options for {comp.operator.displayName}</span
                    >
                    <button
                      type="button"
                      class="btn btn-xs btn-primary"
                      onclick={() => (document.activeElement as HTMLElement)?.blur()}
                    >
                      Done
                    </button>
                  </div>
                  <DynamicForm
                    class="min-w-min"
                    form={comp.operator.optionsForm}
                    bind:value={comp.operator.options}
                  />
                </div>
              </div>
            {/if}
            <Button
              class="btn-xs btn-ghost ml-auto"
              onclick={() => testCase.removeComparison(i)}
            >
              &times;
            </Button>
          </div>
          <div>
            <ValueEditorMount
              value={comp.value}
              onchange={() => testCase.setComparisonValue(i, comp.value)}
            />
          </div>
        </div>
      {/each}
      <Button
        class="btn-xs btn-success self-start"
        onclick={() => testCase.addComparison()}
        disabled={availableOperators.length === 0}
      >
        + Add Comparison
      </Button>
    </div>
  {/if}
</div>
