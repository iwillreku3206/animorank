<script lang="ts">
  import TypeEditor from '$lib/testCase/builtin/functionTestCase/TypeEditor.svelte';
  import { TypeRegistry } from '$lib/testCase/builtin/functionTestCase/typeRegistry';
  import type { Type } from '$lib/testCase/builtin/functionTestCase/type.svelte';

  let { type = $bindable(null) }: { type: Type | null } = $props();
</script>

<TypeEditor
  bind:type
  availableTypes={[...TypeRegistry.instance().keys()]}
/>
