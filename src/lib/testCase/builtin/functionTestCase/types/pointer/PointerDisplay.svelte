<script lang="ts">
  import type { Pointer } from '.';
  import type { TypeValue } from '../../typeValue.svelte';

  let { value }: { value: TypeValue<Pointer> } = $props();
  let targetName = $derived(value.type.targetType.displayName);
  // The pointee data is the target's value shape (e.g. { value: '5' } for an
  // int target); show the scalar when present so results actually display the
  // compared value.
  let pointee = $derived(
    value.value !== null && typeof value.value === 'object' && 'value' in (value.value as Record<string, unknown>)
      ? String((value.value as { value: unknown }).value)
      : JSON.stringify(value.value)
  );
</script>

<pre>*{targetName} = {pointee}</pre>
