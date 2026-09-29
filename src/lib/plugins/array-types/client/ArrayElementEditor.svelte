<script lang="ts">
  import { untrack } from 'svelte';
  import ValueEditorMount from '$lib/testCase/builtin/functionTestCase/ValueEditorMount.svelte';
  import { TypeValue } from '$lib/testCase/builtin/functionTestCase/typeValue.svelte';
  import type { ArrayType } from './arrayType';
  import { elementText, elementValueOf } from '../elementText';

  let { value = $bindable(), index }: { value: TypeValue<ArrayType>; index: number } = $props();

  const elementType = $derived(value.type.elementType);
  const text = $derived(value.value[index] ?? '');

  /**
   * The nested editor works against an element-typed TypeValue, so one is kept
   * per row: rebuilding it per keystroke would remount the nested editor and
   * steal focus.
   */
  let inner = $state(
    TypeValue.assumedValid(
      untrack(() => elementType),
      elementValueOf(
        untrack(() => elementType),
        untrack(() => text)
      )
    )
  );

  /** The element text this row and the array last agreed on. */
  let synced = untrack(() => text);

  /**
   * Keep the row's value and the array's text in step. The editors mutate the
   * value in place instead of reassigning their `value` prop, so there is no
   * change callback to hook: edits are read off the value, and only a text that
   * differs from `synced` (something loaded the row from outside) rebuilds it.
   */
  $effect(() => {
    if (inner.type !== elementType || text !== synced) {
      inner = TypeValue.assumedValid(elementType, elementValueOf(elementType, text));
      synced = text;
      return;
    }

    const edited = elementText(inner.value);
    if (edited !== synced) {
      synced = edited;
      const next = [...value.value];
      next[index] = edited;
      value.value = next;
    }
  });
</script>

<ValueEditorMount
  value={inner}
  onchange={() => {}}
/>
