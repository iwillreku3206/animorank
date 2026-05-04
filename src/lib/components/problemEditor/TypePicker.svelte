<script lang="ts">
  import { TypeRegistry } from '$lib/testCase/typeRegistry';
  import TypePicker from './TypePicker.svelte';

  const registry = TypeRegistry.instance();

  let {
    type = $bindable(),
    value: data = $bindable(),
    root = true
  }: {
    type: string;
    value: any;
    root?: boolean;
  } = $props();

  let previousType = $state(type);

  function updateType(newTypeKey: string) {
    // When the type changes, update the value with the new type's default data
    const newTypeInfo = registry.getStatic(newTypeKey).typeInfo;
    console.log('updating from typepicker');
    if (previousType !== newTypeKey) {
      type = newTypeKey;
      const merged = newTypeInfo.defaultValue;

      for (const k of Object.keys(merged)) {
        if (k in data) {
          merged[k] = data[k];
        }
      }

      data = merged;
      previousType = newTypeKey;
    }
  }

  $effect(() => updateType(type));

  let fields = $derived(registry.getStatic(type).typeInfo.fields);
  let fieldsArr = $derived(Object.values(fields));
  $effect(() => console.log(type));
</script>

<div class="flex flex-col gap-2">
  {#if !root}
    <div class="text-sm text-gray-400 pl-4">
      <!-- Indentation indicator for nested fields -->
    </div>
  {/if}

  <!-- Type selector dropdown -->
  <div class="flex flex-row gap-2 items-center">
    <select
      bind:value={type}
      class="select select-sm select-primary select-bordered w-40"
    >
      {#each registry.getTypeList() as typeKey}
        {#if registry.getStatic(typeKey).typeInfo}
          {@const typeInfo = registry.getStatic(typeKey).typeInfo}
          <option value={typeKey}><typeInfo.icon />{typeInfo.label}</option>
        {/if}
      {/each}
    </select>
  </div>

  <div class="flex flex-col flex-wrap gap-2 mt-2">
    {#each fieldsArr as field}
      {#if field.type === 'type-reference'}
        <div class="flex flex-col gap-1">
          <label class="text-sm">
            {field.label}
            {#if field.name in data}
              <TypePicker
                type={data[field.name]['type']}
                value={data[field.name]['data']}
                root={false}
              />
            {/if}
          </label>
        </div>
      {:else if field.type === 'checkbox'}
        <!-- Checkbox field -->
        <div class="flex flex-row items-center gap-2">
          <label class="text-sm">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              bind:checked={data[field.name]}
            />
            {field.label}
          </label>
        </div>
      {:else if field.type === 'select'}
        <!-- Select field -->
        <div class="flex flex-col gap-1">
          <label class="text-sm">
            {field.label}
            <select
              bind:value={data[field.name]}
              class="select select-sm select-primary select-bordered w-full"
            >
              {#if field.options}
                {#each field.options as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              {/if}
            </select>
          </label>
        </div>
      {:else if field.type === 'number'}
        <!-- Number field -->
        <div class="flex flex-col gap-1">
          <label class="text-sm">
            {field.label}
            <input
              type="number"
              class="input input-sm input-primary input-bordered w-full"
              value={data[field.name] !== undefined && data[field.name] !== null
                ? String(data[field.name])
                : String(field.defaultValue ?? '')}
              oninput={(e) => {
                const parsed = Number((e.target as HTMLInputElement).value);
                data[field.name] = isNaN(parsed) ? field.defaultValue : parsed;
              }}
              placeholder={String(field.defaultValue ?? '')}
            />
          </label>
        </div>
      {:else}
        <!-- Text field -->
        <div class="flex flex-col gap-1">
          <label class="text-sm">
            {field.label}
            <input
              type="text"
              class="input input-sm input-primary input-bordered w-full"
              bind:value={data[field.name]}
              placeholder={String(field.defaultValue ?? '')}
            />
          </label>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .fa-solid {
    color: #94a3b8;
  }
</style>
