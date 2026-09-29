<script lang="ts">
  import type { TypeValue } from '$lib/testCase/builtin/functionTestCase/typeValue.svelte';
  import CloseIcon from '@iconify-svelte/fa6-solid/xmark';
  import PlusIcon from '@iconify-svelte/fa6-solid/plus';
  import ArrayElementEditor from './ArrayElementEditor.svelte';
  import type { ArrayType } from './arrayType';
  import { elementText } from '../elementText';

  let { value = $bindable() }: { value: TypeValue<ArrayType> } = $props();

  // Each row edits its element through the element type's own value editor, so
  // an array of ints shows the int editor and an array of pointers the pointer
  // editor; the array value itself stays the wire's array of strings.
  //
  // The type fixes how many elements the value holds, so the buttons move the
  // value toward that count instead of past it: a value that does not match yet
  // (one written before the length changed) can be corrected from either side,
  // and a matching one offers neither button.
  const length = $derived(value.type.length);
  const canAdd = $derived(value.value.length < length);
  const canRemove = $derived(value.value.length > length);

  function addElement() {
    value.value = [...value.value, elementText(value.type.elementType.defaultValue().value)];
  }

  function removeElement(index: number) {
    value.value = value.value.filter((_, i) => i !== index);
  }
</script>

<div class="flex flex-col gap-1">
  {#each Array.from({ length: value.value.length }, (_, index) => index) as index (index)}
    <div class="flex items-center gap-1">
      <div class="flex-1">
        <ArrayElementEditor
          {value}
          {index}
        />
      </div>
      <button
        type="button"
        class="btn btn-xs btn-ghost btn-square"
        aria-label="Remove element"
        disabled={!canRemove}
        onclick={() => removeElement(index)}
      >
        <CloseIcon class="h-3 w-3" />
      </button>
    </div>
  {/each}
  <button
    type="button"
    class="btn btn-xs btn-ghost self-start gap-1"
    disabled={!canAdd}
    onclick={addElement}
  >
    <PlusIcon class="h-3 w-3" /> element
  </button>
</div>
