<script lang="ts">
  import type { Pointer } from '.';
  import type { TypeValue } from '../../typeValue.svelte';

  let { value }: { value: TypeValue<Pointer> } = $props();
  let targetName = $derived(value.type.targetType.displayName);
</script>

<pre>*{targetName}</pre>
