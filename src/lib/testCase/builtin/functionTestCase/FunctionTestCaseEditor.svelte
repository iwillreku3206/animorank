<script lang="ts">
  import type { FunctionTestCase } from './functionTestCase.svelte';
  import type { Symbol } from './types';
  import { TypeValue } from './typeValue.svelte';
  import { Comparison } from './comparison.svelte';
  import { OperatorRegistry } from './operatorRegistry';
  import type { Operator } from './operator.svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import ValueEditorMount from './ValueEditorMount.svelte';
  import type { IntoJsonValue } from '$lib/types/utils';

  let { testCase }: { testCase: FunctionTestCase } = $props();

  const opRegistry = OperatorRegistry.instance();

  let problemData = $derived(testCase.problem.functionData);
  let availableFunctions = $derived(Object.entries(problemData.functions).map(([id, fn]) => ({ id, name: fn.name })));
  let availableOperators = $derived([...opRegistry.keys()]);
  let operatorNames = $derived(
    Object.fromEntries(availableOperators.map((key) => [key, opRegistry.getStatic(key).create().displayName]))
  );

  let fnDef = $derived(testCase.data.function ? problemData.functions[testCase.data.function] : null);

  let availableSymbols = $derived([
    { value: 'return' as Symbol, label: 'return' },
    ...testCase.data.parameters.map((p, i) => ({
      value: `param${i}` as Symbol,
      label: p.name || `param${i}`
    }))
  ]);

  // Direct mutations on testCase.data
  function selectFunction(fnName: string) {
    const def = problemData.functions[fnName];
    testCase.data = {
      function: fnName,
      parameters: def
        ? def.parameters.map((p) => ({
            name: p.name,
            value: p.type!.defaultValue()
          }))
        : [],
      comparisons: []
    };
  }

  function onParamChange(i: number, val: TypeValue) {
    testCase.data.parameters[i].value = val;
  }

  function onCompSymbol(i: number, symbol: Symbol) {
    testCase.data.comparisons[i].symbol = symbol;
  }

  function onCompOp(i: number, opKey: string) {
    const operator = opRegistry.getStatic(opKey).create();
    testCase.data.comparisons[i].operator = operator;
  }

  function onCompValue(i: number, val: TypeValue) {
    testCase.data.comparisons[i].value = val;
  }

  function addComparison() {
    const returnType = fnDef?.returnType[0];
    if (!returnType || availableOperators.length === 0) return;
    const operator = opRegistry.getStatic(availableOperators[0]).create();
    const comp = Comparison.create(returnType, operator);
    testCase.data.comparisons = [...testCase.data.comparisons, comp];
  }

  function removeComparison(i: number) {
    testCase.data.comparisons = testCase.data.comparisons.filter((_, j) => j !== i);
  }
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
      class="select select-sm select-bordered flex-1"
      value={testCase.data.function}
      onchange={(e) => selectFunction((e.target as HTMLSelectElement).value)}
    >
      <option value="">-- Select a function --</option>
      {#each availableFunctions as fn}
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
          <span class="text-sm font-mono whitespace-nowrap min-w-[60px]">{param.name || `param${i}`}</span>
          <div class="flex-1">
            <ValueEditorMount
              value={param.value}
              onchange={() => onParamChange(i, param.value)}
            />
          </div>
        </div>
      {/each}
    </div>
  {:else if testCase.data.function}
    <p class="text-gray-500 text-sm">This function has no parameters.</p>
  {/if}

  <!-- Comparisons -->
  <div class="flex flex-col gap-2">
    <span class="text-sm font-medium">Comparisons:</span>
    {#if testCase.data.comparisons.length === 0}
      <p class="text-gray-500 text-sm">No comparisons yet. Add one below.</p>
    {/if}
    {#each testCase.data.comparisons as comp, i (i)}
      <div class="flex flex-col gap-2 bg-[#1a1a1a] rounded p-2">
        <div class="flex flex-row gap-2 items-center">
          <select
            class="select select-sm select-bordered"
            value={comp.symbol as string}
            onchange={(e) => onCompSymbol(i, (e.target as HTMLSelectElement).value as Symbol)}
          >
            {#each availableSymbols as sym}
              <option value={sym.value}>{sym.label}</option>
            {/each}
          </select>
          {#if availableOperators.length > 0}
            <select
              class="select select-sm select-bordered"
              value={comp.operator.id}
              onchange={(e) => onCompOp(i, (e.target as HTMLSelectElement).value)}
            >
              {#each availableOperators as opKey}
                <option value={opKey}>{operatorNames[opKey]}</option>
              {/each}
            </select>
          {/if}
          <Button
            class="btn-xs btn-ghost ml-auto"
            onclick={() => removeComparison(i)}
          >
            &times;
          </Button>
        </div>
        <div>
          <ValueEditorMount
            value={comp.value}
            onchange={() => onCompValue(i, comp.value)}
          />
        </div>
      </div>
    {/each}
    {#if testCase.data.function}
      <Button
        class="btn-xs btn-success self-start"
        onclick={addComparison}
        disabled={availableOperators.length === 0}
      >
        + Add Comparison
      </Button>
    {/if}
  </div>
</div>
