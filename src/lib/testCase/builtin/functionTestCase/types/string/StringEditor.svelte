<script lang="ts">
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import type { StringType } from '.';
  import type { TypeValue } from '../../typeValue.svelte';

  let { value = $bindable() }: { value: TypeValue<StringType> } = $props();
</script>

<TextInput
  class="font-mono input-xs"
  bind:value={value.value.value}
/>
