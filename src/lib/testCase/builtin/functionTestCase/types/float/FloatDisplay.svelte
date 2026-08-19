<script lang="ts">
  import type { Float } from '.';
  import type { TypeValue } from '../../typeValue.svelte';

  let { value }: { value: TypeValue<Float> } = $props();
  let realValue = $derived.by(() => value.value.value);
</script>

<pre>{realValue}</pre>
