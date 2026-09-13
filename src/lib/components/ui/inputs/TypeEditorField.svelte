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

  const typeRegistry = GlobalRegistryProvider.instance().getRegistry(TypeRegistry);

  // The dropdown offers every registered type, so plugins that add types load
  // before it is built (`loadKeys` cannot be a `$derived`: a plugin is awaited).
  let availableTypes = $state<string[]>([]);
  $effect(() => {
    void typeRegistry.loadKeys().then((keys) => {
      availableTypes = keys.filter((id) => !excludeTypeIds.includes(id));
    });
  });
</script>

<TypeEditor
  bind:type
  {availableTypes}
/>
