<script lang="ts">
  import { untrack } from 'svelte';
  import ValueEditorMount from '../../ValueEditorMount.svelte';
  import { TypeValue } from '../../typeValue.svelte';
  import type { Type } from '../../type.svelte';
  import type { Pointer } from '.';

  let { value = $bindable() }: { value: TypeValue<Pointer> } = $props();

  const target = $derived(value.type.targetType);

  // The nested editor works against a target-typed TypeValue. Rebuild it only
  // when the pointer's target type actually changes. The guard keeps the
  // write tracked: an effect that writes state it never reads is rescheduled
  // by Svelte after unrelated flushes, which would reassign `inner` (and
  // remount the nested editor, stealing focus) on every keystroke.
  let inner = $state<TypeValue<Type>>(new TypeValue(target, value.value));
  $effect(() => {
    if (inner.type !== target) {
      inner = new TypeValue(
        target,
        untrack(() => value.value)
      );
    }
  });

  function writeBack() {
    value.value = inner.value;
  }
</script>

<div class="flex items-center gap-2">
  <ValueEditorMount
    value={inner}
    onchange={writeBack}
  />
</div>
