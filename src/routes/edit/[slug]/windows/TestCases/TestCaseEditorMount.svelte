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

    // Teardown: Svelte runs only the returned cleanup when the effect re-runs
    // or the host component is destroyed. Without this, the last mounted
    // editor was never unmounted — every deleted test case or closed window
    // leaked the editor, its live effects, and its references into the
    // test-case state graph.
    return () => {
      if (mounted) {
        unmount(mounted);
        mounted = undefined;
      }
    };
  });
</script>

<div
  bind:this={container}
  class="w-full"
></div>
