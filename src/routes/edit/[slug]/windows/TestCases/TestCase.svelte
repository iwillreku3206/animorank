<script lang="ts">
  import deleteIcon from '$lib/assets/delete.svg';
  import EyeIcon from '@iconify-svelte/fa6-solid/eye';
  import EyeSlashIcon from '@iconify-svelte/fa6-solid/eye-slash';
  import type {
    CustomTestCase,
    FunctionOutputTestCase,
    ProblemTestCase,
    ProgramIOTestCase
  } from '$lib/zenstack/models';
  import CustomTest from './CustomTest.svelte';
  import FunctionReturnValueTest from './FunctionReturnValueTest.svelte';
  import ProgramIOTest from './ProgramIOTest.svelte';

  let {
    testCase = $bindable(),
    order,
    onDelete,
    deleteDisabled
  }: {
    testCase: ProblemTestCase;
    order: number;
    onDelete?: () => void;
    deleteDisabled: boolean;
  } = $props();

  function toggleVisibility() {
    testCase.public = !testCase.public;
  }
</script>

<div class="w-full bg-[#212121] rounded-lg p-4">
  <div class="flex flex-col">
    <div class="flex flex-row gap-2 items-center">
      Test Case #{order}: {testCase.type}
      <div class="ml-auto flex gap-1">
        <button
          title={testCase.public ? 'Hide Test Case' : 'Show Test Case'}
          class="btn btn-xs btn-ghost"
          onclick={toggleVisibility}
        >
          {#if testCase.public}
            <EyeIcon class="h-4 w-4" />
          {:else}
            <EyeSlashIcon class="h-4 w-4" />
          {/if}
        </button>
        <button
          title="Delete Test Case"
          class="btn btn-xs btn-ghost"
          onclick={onDelete}
          disabled={deleteDisabled}
        >
          <img
            src={deleteIcon}
            alt="Delete Icon"
            class={`${!deleteDisabled ? 'red-svg' : 'disabled-svg'} h-full w-full`}
          />
        </button>
      </div>
    </div>
    {#if testCase.type == 'FunctionOutputTestCase'}
      <FunctionReturnValueTest bind:testCase={testCase as FunctionOutputTestCase} />
    {:else if testCase.type == 'ProgramIOTestCase'}
      <ProgramIOTest bind:testCase={testCase as ProgramIOTestCase} />
    {:else if testCase.type == 'CustomTestCase'}
      <CustomTest bind:testCase={testCase as CustomTestCase} />
    {/if}
  </div>
</div>

<style>
  .red-svg {
    filter: brightness(0) saturate(100%) invert(17%) sepia(80%) saturate(5957%) hue-rotate(6deg)
      brightness(107%) contrast(134%);
  }

  .disabled-svg {
    filter: brightness(0) saturate(100%) invert(25%) sepia(7%) saturate(0%) hue-rotate(158deg)
      brightness(92%) contrast(87%);
  }
</style>
