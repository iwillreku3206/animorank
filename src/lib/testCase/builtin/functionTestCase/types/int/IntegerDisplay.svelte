<script lang="ts">
  import type { Integer } from '.';
  import type { TypeValue } from '../../typeValue.svelte';

  let { value }: { value: TypeValue<Integer> } = $props();
  let realValue = $derived.by(() => value.value);
</script>

<pre>{realValue}</pre>
