<script lang="ts">
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import type { TypeValue } from '$lib/testCase/builtin/functionTestCase/typeValue.svelte';
  import CloseIcon from '@iconify-svelte/fa6-solid/xmark';
  import PlusIcon from '@iconify-svelte/fa6-solid/plus';
  import type { ArrayType } from './arrayType';

  let { value = $bindable() }: { value: TypeValue<ArrayType> } = $props();

  // The element type only decides how each row is prompted; the value stays an
  // array of strings, which is what the harness round-trips.
  const elementId = $derived(value.type.options.element);
  const placeholder = $derived(
    elementId === 'int' ? 'integer' : elementId === 'float' ? 'number' : elementId === 'string' ? 'text' : elementId
  );

  function addElement() {
    value.value = [...value.value, ''];
  }

  function removeElement(index: number) {
    value.value = value.value.filter((_, i) => i !== index);
  }
</script>

<div class="flex flex-col gap-1">
  {#each Array.from({ length: value.value.length }, (_, index) => index) as index (index)}
    <div class="flex items-center gap-1">
      <TextInput
        class="font-mono input-xs flex-1"
        {placeholder}
        bind:value={value.value[index]}
      />
      <button
        type="button"
        class="btn btn-xs btn-ghost btn-square"
        aria-label="Remove element"
        onclick={() => removeElement(index)}
      >
        <CloseIcon class="h-3 w-3" />
      </button>
    </div>
  {/each}
  <button
    type="button"
    class="btn btn-xs btn-ghost self-start gap-1"
    onclick={addElement}
  >
    <PlusIcon class="h-3 w-3" /> element
  </button>
</div>
