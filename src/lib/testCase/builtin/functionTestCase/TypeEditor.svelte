<script lang="ts">
  import DynamicForm from '$lib/components/ui/inputs/DynamicForm.svelte';
  import type { Component, ComponentType } from 'svelte';
  import type { Type } from './type.svelte';
  import { GlobalRegistryProvider } from '$lib/registry/global';
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
  const typeRegistry = GlobalRegistryProvider.instance().getRegistry(TypeRegistry);

  let typeNames = $state<Record<string, string>>({});
  let typeIcons = $state<Record<string, Component | ComponentType | undefined>>({});
  $effect(() => {
    const types = availableTypes;
    void Promise.all(
      types.map(async (t) => {
        const typeClass = await typeRegistry.getStatic(t);
        return [t, typeClass.create().displayName, typeClass.icon] as const;
      })
    ).then((entries) => {
      typeNames = Object.fromEntries(entries.map(([t, name]) => [t, name]));
      typeIcons = Object.fromEntries(entries.map(([t, , icon]) => [t, icon]));
    });
  });

  async function selectType(typeId: string) {
    type = typeId ? (await typeRegistry.getStatic(typeId)).create() : null;
  }
</script>

<span class="inline-flex items-center gap-1">
  <!-- Type icons cannot go inside a native `<option>`, so the list is a
       dropdown of buttons, rendered the way DynamicForm renders a select whose
       options carry icons. -->
  <div class="dropdown">
    <div
      tabindex="0"
      role="button"
      class="select select-xs select-primary min-w-24 justify-between"
    >
      <span class="flex items-center gap-2">
        {#if type && typeIcons[type.id]}
          {@const SelectedIcon = typeIcons[type.id]}
          <SelectedIcon class="w-4 h-4 shrink-0" />
        {/if}
        <span>{type?.displayName ?? 'type'}</span>
      </span>
    </div>
    <div
      tabindex="0"
      role="menu"
      class="dropdown-content menu p-2 shadow bg-base-100 rounded-box min-w-full z-10"
    >
      {#each availableTypes as t (t)}
        <li>
          <button
            role="menuitem"
            class:active={type?.id === t}
            onclick={() => {
              void selectType(t);
              (document.activeElement as HTMLElement)?.blur();
            }}
          >
            {#if typeIcons[t]}
              {@const TypeIcon = typeIcons[t]}
              <TypeIcon class="w-4 h-4 shrink-0" />
            {/if}
            {type?.id === t ? type.displayName : (typeNames[t] ?? t)}
          </button>
        </li>
      {/each}
    </div>
  </div>
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
