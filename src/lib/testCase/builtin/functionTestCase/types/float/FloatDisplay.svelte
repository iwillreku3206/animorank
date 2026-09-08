<script lang="ts">
  import type { Float } from '.';
  import type { TypeValue } from '../../typeValue.svelte';

  let { value }: { value: TypeValue<Float> } = $props();

  let realValue = $derived.by(() => {
    const raw = value.value.value;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? String(parsed) : String(raw);
  });
</script>

<pre>{realValue}</pre>
