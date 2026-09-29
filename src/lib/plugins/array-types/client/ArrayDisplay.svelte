<script lang="ts">
  import type { TypeValue } from '$lib/testCase/builtin/functionTestCase/typeValue.svelte';
  import type { ArrayType } from './arrayType';

  let { value }: { value: TypeValue<ArrayType> } = $props();

  const elements = $derived(value.value);
</script>

<pre>[{elements.join(', ')}]</pre>
