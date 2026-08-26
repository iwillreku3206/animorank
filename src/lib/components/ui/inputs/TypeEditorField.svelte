<script lang="ts">
  import TypeEditor from '$lib/testCase/builtin/functionTestCase/TypeEditor.svelte';
  import { GlobalRegistryProvider } from '$lib/registry/global';
  import { TypeRegistry } from '$lib/testCase/builtin/functionTestCase/typeRegistry';
  import type { Type } from '$lib/testCase/builtin/functionTestCase/type.svelte';

  let {
    type = $bindable(null),
    excludeTypeIds = []
  }: {
    type: Type | null;
    excludeTypeIds?: readonly string[];
  } = $props();
</script>

<TypeEditor
  bind:type
  availableTypes={[...GlobalRegistryProvider.instance().getRegistry(TypeRegistry).keys()].filter(
    (t) => !excludeTypeIds.includes(t)
  )}
/>
