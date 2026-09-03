<script lang="ts">
  import CustomInputPanel from '$lib/components/solve/CustomInputPanel.svelte';
  import type { SolveWindowContext } from '../context.svelte';

  let { context }: { context: SolveWindowContext } = $props();
</script>

<div class="h-full">
  <CustomInputPanel
    loading={context.customRunLoading}
    result={context.customRunResult}
    onRun={(stdin) => context.customRun(stdin)}
  />
</div>
