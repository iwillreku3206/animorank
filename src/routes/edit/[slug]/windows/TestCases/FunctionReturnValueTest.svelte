<script lang="ts">
  import { type FunctionOutputTestCase } from '$lib/zenstack/models';
  import DeleteIcon from '$lib/assets/delete.svg';
  import TypePicker from './TypePicker.svelte';
  import { TypeRegistry } from '$lib/testCase/typeRegistry';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';

  let { testCase = $bindable() }: { testCase: FunctionOutputTestCase } = $props();

  const registry = TypeRegistry.instance();

  const deleteParameter = (index: number) => () => {
    testCase.parameters = testCase.parameters.filter((_, i) => i !== index);
  };

  function addParameter() {
    const intTypeInfo = registry.getStatic('int').typeInfo;
    testCase.parameters.push({
      type: 'int',
      data: structuredClone(intTypeInfo.defaultValue)
    });
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
</script>

<div class="flex flex-col flex-wrap gap-2">
  <TextInput
    type="text"
    class="input-sm input-primary input-bordered w-full"
    placeholder="Function Name (Case-sensitive)"
    bind:value={testCase.function_name}
  />
  Return Type:
  <TypePicker
    root={false}
    bind:type={testCase.return_type.type}
    bind:data={testCase.return_type.data}
  />
  Comparisons:
  {#if testCase.comparisons.length === 0}
    <p class="text-gray-500 text-sm">No comparisons yet. Add one below.</p>
  {/if}
  {#each testCase.comparisons as comp, i (i)}
    <div class="flex flex-row flex-wrap gap-2 items-end">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">
          Compare
          <select
            bind:value={comp.symbol}
            class="select select-xs select-primary select-bordered w-32"
          >
            <option value="return">return value</option>
            <!--eslint-disable-next-line @typescript-eslint/no-unused-vars-->
            {#each testCase.parameters as _, j (j)}
              <option value={`${j}`}>param {j}</option>
            {/each}
          </select>
        </label>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">
          Operator
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
        </label>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">
          Type
          <select
            bind:value={comp.type}
            class="select select-xs select-primary select-bordered w-32"
          >
            {#each registry.getTypeList() as typeKey (typeKey)}
              <option value={typeKey}>{registry.getStatic(typeKey)?.typeInfo.label || typeKey}</option>
            {/each}
          </select>
        </label>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">
          Value
          <TypePicker
            bind:type={testCase.comparisons[i].type}
            bind:data={testCase.comparisons[i].data}
          />
        </label>
      </div>
      {#if comp.operator === 'WITHIN_RANGE'}
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400">
            Range
            <TextInput
              type="text"
              class="input-xs input-primary input-bordered w-24"
              placeholder="Range"
              bind:value={comp.range_value}
            />
          </label>
        </div>
      {/if}
      <Button
        class="btn-xs btn-ghost self-end"
        onclick={deleteComparison(i)}
      >
        <img
          src={DeleteIcon}
          class="svg-red w-full h-full"
          alt="delete comparison"
        />
      </Button>
    </div>
  {/each}
  <Button
    class="btn-success w-full btn-sm"
    onclick={addComparison}>Add Comparison</Button
  >
  Input Parameters:
  {#each testCase.parameters as param, i (i)}
    <div class="flex flex-row flex-wrap gap-2 items-center">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">
          Type
          <select
            bind:value={param.type}
            class="select select-xs select-primary select-bordered w-32"
          >
            {#each registry.getTypeList() as typeKey (typeKey)}
              <option value={typeKey}>{registry.getStatic(typeKey).typeInfo.label || typeKey}</option>
            {/each}
          </select>
        </label>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">
          Value
          <TypePicker
            bind:type={testCase.parameters[i].type}
            bind:data={testCase.parameters[i].data}
          />
        </label>
      </div>
      <Button
        class="btn-xs btn-ghost"
        onclick={deleteParameter(i)}
      >
        <img
          src={DeleteIcon}
          class="svg-red w-full h-full"
          alt="delete test case"
        />
      </Button>
    </div>
  {/each}
  <Button
    class="btn-success w-full btn-sm"
    onclick={addParameter}
  >
    Add Parameter
  </Button>
</div>

<style>
  .svg-red {
    filter: brightness(0) saturate(100%) invert(13%) sepia(87%) saturate(7148%) hue-rotate(357deg) brightness(90%)
      contrast(126%);
  }

  .select-primary {
    --tw-border-color: oklch(0.636 0.293 279.44);
  }
</style>
