<script lang="ts">
  import DynamicForm from '$lib/components/ui/inputs/DynamicForm.svelte';
  import type { Type } from './type.svelte';
  import { TypeRegistry } from './typeRegistry';
  import GearIcon from '@iconify-svelte/fa6-solid/gear';

  let {
    type = $bindable(null),
    availableTypes,
    dropdownAlign = 'end'
  }: {
    type: Type | null;
    availableTypes: string[];
    dropdownAlign?: 'start' | 'end';
  } = $props();
  const typeRegistry = TypeRegistry.instance();

  function selectType(typeId: string) {
    type = typeId ? typeRegistry.getStatic(typeId).create() : null;
  }
</script>

<span class="inline-flex items-center gap-1">
  <select
    class="select select-xs select-primary min-w-24"
    value={type?.id ?? ''}
    onchange={(e) => selectType((e.target as HTMLSelectElement).value)}
  >
    <option
      value=""
      disabled>type</option
    >
    {#each availableTypes as t (t)}
      <option value={t}>
        {type?.id === t ? type.displayName : typeRegistry.getStatic(t).create().displayName}
      </option>
    {/each}
  </select>
  {#if type}
    <div class="dropdown dropdown-{dropdownAlign}">
      <div
        tabindex="0"
        role="button"
        class="btn btn-xs btn-ghost btn-square text-base-content/70 hover:text-base-content"
        aria-label="Edit type options"
      >
        <GearIcon class="h-4 w-4" />
      </div>
      <div
        tabindex="-1"
        class="dropdown-content z-50 bg-base-200 border border-base-300 rounded-box p-3 shadow-lg min-w-max"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-base-content/70">Options for {type.displayName}</span>
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
          form={type.optionsForm}
          bind:value={type.options}
        />
      </div>
    </div>
  {/if}
</span>
