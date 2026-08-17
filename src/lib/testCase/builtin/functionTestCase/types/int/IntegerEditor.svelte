<script lang="ts">
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import type { Integer } from '.';
  import type { TypeValue } from '../../typeValue.svelte';

  let { value = $bindable() }: { value: TypeValue<Integer> } = $props();
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
  Error: integer is invalid. Kindly check the size limits of the integer, or your syntax. The JavaScript <a
    target="_blank"
    href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt">BigInt</a
  > syntax is used for parsing the integer
{/if}
