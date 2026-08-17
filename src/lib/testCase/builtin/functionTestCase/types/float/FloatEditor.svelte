<script lang="ts">
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import type { Float } from '.';
  import type { TypeValue } from '../../typeValue.svelte';

  let { value = $bindable() }: { value: TypeValue<Float> } = $props();
  let localValue: string = $state(value.value.value);
  let error = $state(false);

  $effect(() => {
    value.type.validateValue({ value: localValue }).then((valid) => {
      if (valid === true) {
        error = false;
        value.value.value = localValue;
      } else {
        error = true;
      }
    });
  });
</script>

<TextInput
  class="font-mono input-xs"
  bind:value={localValue}
/>

{#if error}
  Error: floating point value is invalid. Use decimal or scientific notation (e.g. 1.5, -0.25, 2e10)
{/if}
