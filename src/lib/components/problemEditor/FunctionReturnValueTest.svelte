<script lang="ts">
  import { type FunctionOutputTestCase } from '$lib/zenstack/models';
  import DeleteIcon from '$lib/assets/delete.svg';
  import TypePicker from './TypePicker.svelte';
  import { TypeRegistry } from '$lib/testCase/typeRegistry';

  let { testCase = $bindable() }: { testCase: FunctionOutputTestCase } = $props();

  const registry = TypeRegistry.instance();

  const deleteParameter = (index: number) => () => {
    testCase.parameters = testCase.parameters.filter((_, i) => i !== index);
  };

  function addParameter() {
    const intTypeInfo = registry.getStatic('int').typeInfo;
    if (intTypeInfo) {
      testCase.parameters.push({
        type: 'int',
        data: structuredClone(intTypeInfo.defaultValue)
      });
    }
  }

  function updateParameterType(index: number, typeKey: string) {
    const typeInfo = registry.getStatic(typeKey).typeInfo;
    if (typeInfo) {
      const param = testCase.parameters[index];
      param.type = typeKey;
      param.data = { ...typeInfo.defaultValue, ...(param.data as object) };
    }
  }

  function getParameterType(index: number) {
    return testCase.parameters[index]?.type || 'int';
  }

  function getParameterTypeInfo(index: number) {
    const typeKey = getParameterType(index);
    return registry.getStatic(typeKey).typeInfo;
  }

  const addComparison = () => {
    const intTypeInfo = registry.getStatic('int').typeInfo;
    if (intTypeInfo) {
      testCase.comparisons.push({
        symbol: 'return',
        type: 'int',
        data: structuredClone(intTypeInfo.defaultValue),
        operator: 'EQUAL',
        range_value: null
      });
    }
  };

  const deleteComparison = (index: number) => () => {
    testCase.comparisons = testCase.comparisons.filter((_, i) => i !== index);
  };

  const updateComparisonExpectedType = (index: number, typeKey: string) => {
    const typeInfo = registry.getStatic(typeKey).typeInfo;
    console.log('updating:', typeInfo);
    if (typeInfo) {
      const comp = testCase.comparisons[index];
      comp.type = typeKey;
      comp.data = { ...typeInfo.defaultValue, ...(comp.data as object) };
    }
  };

  const updateComparisonSymbol = (index: number, symbol: string) => {
    testCase.comparisons[index].symbol = symbol;
  };

  const getComparisonExpectedTypeInfo = (index: number) => {
    const comp = testCase.comparisons[index];
    return registry.getStatic(comp?.type || 'int').typeInfo;
  };

  const getComparisonSymbolLabel = (symbol: string) => {
    if (symbol === 'return') return 'return value';
    const paramIndex = parseInt(symbol.replace('param_', ''));
    return `param ${paramIndex}`;
  };
</script>

<div class="flex flex-col flex-wrap gap-2">
  <input
    type="text"
    class="input input-sm input-primary input-bordered w-full"
    placeholder="Function Name (Case-sensitive)"
    bind:value={testCase.function_name}
  />
  Comparisons:
  {#if testCase.comparisons.length === 0}
    <p class="text-gray-500 text-sm">No comparisons yet. Add one below.</p>
  {/if}
  {#each testCase.comparisons as comp, i}
    <div class="flex flex-row flex-wrap gap-2 items-end">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">Compare</label>
        <select
          bind:value={comp.symbol}
          class="select select-xs select-primary select-bordered w-32"
        >
          <option value="return">return value</option>
          {#each testCase.parameters as param, j}
            <option value={`param_${j}`}>param {j}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">Operator</label>
        <select
          bind:value={comp.operator}
          class="select select-xs select-primary select-bordered w-32"
        >
          <option value="EQUAL">==</option>
          <option value="NOT_EQUAL">!=</option>
          <option value="LESS_THAN">&lt;</option>
          <option value="LESS_THAN_EQUAL">&lt;=</option>
          <option value="GREATER_THAN">&gt;</option>
          <option value="GREATER_THAN_EQUAL">&gt;=</option>
          <option value="WITHIN_RANGE">±</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">Type</label>
        <select
          bind:value={comp.type}
          class="select select-xs select-primary select-bordered w-32"
        >
          {#each registry.getTypeList() as typeKey}
            <option value={typeKey}>{registry.getStatic(typeKey)?.typeInfo.label || typeKey}</option
            >
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">Value</label>
        <TypePicker
          bind:type={testCase.comparisons[i].type}
          bind:value={testCase.comparisons[i].data}
        />
      </div>
      {#if comp.operator === 'WITHIN_RANGE'}
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400">Range</label>
          <input
            type="text"
            class="input input-xs input-primary input-bordered w-24"
            placeholder="Range"
            bind:value={comp.range_value}
          />
        </div>
      {/if}
      <button
        class="btn btn-xs btn-ghost self-end"
        onclick={deleteComparison(i)}
      >
        <img
          src={DeleteIcon}
          class="svg-red w-full h-full"
          alt="delete comparison"
        />
      </button>
    </div>
  {/each}
  <button
    class="btn btn-success w-full btn-sm"
    onclick={addComparison}>Add Comparison</button
  >
  Input Parameters:
  {#each testCase.parameters as param, i}
    <div class="flex flex-row flex-wrap gap-2 items-center">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">Type</label>
        <select
          bind:value={param.type}
          class="select select-xs select-primary select-bordered w-32"
        >
          {#each registry.getTypeList() as typeKey}
            <option value={typeKey}>{registry.getStatic(typeKey).typeInfo.label || typeKey}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">Value</label>
        <TypePicker
          typeInfo={getParameterTypeInfo(i)}
          value={param.data}
        />
      </div>
      <button
        class="btn btn-xs btn-ghost"
        onclick={deleteParameter(i)}
      >
        <img
          src={DeleteIcon}
          class="svg-red w-full h-full"
          alt="delete test case"
        />
      </button>
    </div>
  {/each}
  <button
    class="btn btn-success w-full btn-sm"
    onclick={addParameter}>Add Parameter</button
  >
</div>

<style>
  .svg-red {
    filter: brightness(0) saturate(100%) invert(13%) sepia(87%) saturate(7148%) hue-rotate(357deg)
      brightness(90%) contrast(126%);
  }

  .input-primary {
    --tw-border-color: oklch(0.636 0.293 279.44);
  }

  .select-primary {
    --tw-border-color: oklch(0.636 0.293 279.44);
  }
</style>
