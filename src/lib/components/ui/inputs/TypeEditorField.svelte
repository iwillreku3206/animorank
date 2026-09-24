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
  // The keys are the state and the exclusions are derived from them, so a
  // changed `excludeTypeIds` re-filters the list instead of being read once,
  // inside the promise callback, and never noticed again.
  let typeIds = $state<string[]>([]);
  const availableTypes = $derived(typeIds.filter((id) => !excludeTypeIds.includes(id)));

  $effect(() => {
    void typeRegistry.loadKeys().then((keys) => {
      typeIds = keys;
    });
  });
</script>

<TypeEditor
  bind:type
  {availableTypes}
/>
