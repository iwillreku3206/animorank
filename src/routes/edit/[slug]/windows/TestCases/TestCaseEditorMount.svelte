<script lang="ts">
  import { mount, unmount } from 'svelte';
  import type { TestCase } from '$lib/testCase/testCase.svelte';

  let { testCase }: { testCase: TestCase } = $props();

  let container: HTMLDivElement | undefined = $state();
  let mounted: ReturnType<typeof mount> | undefined;

  $effect(() => {
    const el = container;
    if (!el) return;

    if (mounted) {
      unmount(mounted);
      mounted = undefined;
    }

    const component = testCase.editor;
    if (!component) return;

    mounted = mount(component, {
      target: el,
      props: { testCase }
    });
  });
</script>

<div
  bind:this={container}
  class="w-full"
></div>
