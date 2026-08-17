<script lang="ts">
  import type { StringType } from '.';
  import type { TypeValue } from '../../typeValue.svelte';

  let { value }: { value: TypeValue<StringType> } = $props();
  let realValue = $derived.by(() => value.value);
</script>

<pre>{realValue}</pre>
