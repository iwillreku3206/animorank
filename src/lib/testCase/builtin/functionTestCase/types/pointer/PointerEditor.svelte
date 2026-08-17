<script lang="ts">
  import { untrack } from 'svelte';
  import ValueEditorMount from '../../ValueEditorMount.svelte';
  import { TypeRegistry } from '../../typeRegistry';
  import { TypeValue } from '../../typeValue.svelte';
  import type { Type } from '../../type.svelte';
  import type { Pointer } from '.';

  let { value = $bindable() }: { value: TypeValue<Pointer> } = $props();

  const target = $derived(value.type.targetType);

  // Rebuild the inner TypeValue only when the pointer's target type changes,
  // so editing the inner value does not remount the nested editor.
  let inner = $state<TypeValue<Type>>(new TypeValue(target, value.value));
  $effect(() => {
    inner = new TypeValue(
      target,
      untrack(() => value.value)
    );
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
