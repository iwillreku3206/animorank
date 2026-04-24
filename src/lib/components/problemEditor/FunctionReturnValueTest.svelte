<script lang="ts">
  import { type FunctionOutputTestCase, type ProblemTestCase } from '$lib/zenstack/models';
  import DeleteIcon from '$lib/assets/delete.svg';
  import CParameterSelector from './CParameterSelector.svelte';

  let { testCase = $bindable() }: { testCase: FunctionOutputTestCase } = $props();

  const deleteParameter = (index: number) => () => {
    testCase.parameters = testCase.parameters.filter((_, i) => i !== index);
  };
</script>

<div class="flex flex-col gap-2">
  <input
    type="text"
    class="focus:bg-transparent input input-sm input-ghost input-bordered w-full"
    placeholder="Function Name (Case-sensitive)"
    bind:value={testCase.function_name}
  />
  Return Value:
  <div class="flex flex-row gap-2">
    <CParameterSelector bind:type={testCase.expected_output} />
    <select
      bind:value={testCase.operator}
      class="focus:bg-transparent select select-sm select-ghost select-bordered w-32"
    >
      <option value="EQUAL">==</option>
      <option value="NOT_EQUAL">!=</option>
      <option value="LESS_THAN">&lt;</option>
      <option value="LESS_THAN_EQUAL">&lt;=</option>
      <option value="GREATER_THAN">&gt;</option>
      <option value="GREATER_THAN_EQUAL">&gt;=</option>
      <option value="WITHIN_RANGE">±</option>
      <option value="LEVENSHTEIN_SIMILARITY">Levenshtein &lt;</option>
    </select>
    <input
      type="text"
      class="focus:bg-transparent input input-sm input-ghost input-bordered w-full"
      placeholder="Return Value (C literal)"
      bind:value={testCase.expected_output.value}
    />
  </div>
  Input Parameters:
  {#each testCase.parameters as _, i}
    <div class="flex flex-row gap-2 items-center">
      <CParameterSelector bind:type={testCase.parameters[i]} />
      <input
        type="text"
        class="focus:bg-transparent input input-sm input-ghost input-bordered w-full"
        placeholder="Input (C literal)"
        bind:value={testCase.parameters[i].value}
      />
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
    onclick={() => testCase.parameters.push({ base: 'INT', value: '' })}>Add Parameter</button
  >
</div>

<style>
  .svg-red {
    filter: brightness(0) saturate(100%) invert(13%) sepia(87%) saturate(7148%) hue-rotate(357deg)
      brightness(90%) contrast(126%);
  }
</style>
