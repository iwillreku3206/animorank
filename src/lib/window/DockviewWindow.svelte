<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { DockviewWindowManager, type DockviewWindowManagerOptions } from './dockviewWindowManager';
  import type { DefaultLayout } from './layout';
  import type { WindowRegistry } from './windowRegistry';

  let {
    context = $bindable(),
    windowRegistry,
    storageKey,
    defaultLayout,
    manager = $bindable()
  }: {
    context: unknown;
    // `WindowRegistry`'s protected `_registry` is invariant in its type
    // parameters, so an erased `any` is required to accept any window registry.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    windowRegistry: WindowRegistry<any>;
    storageKey?: string;
    defaultLayout?: DefaultLayout;
    manager?: DockviewWindowManager<unknown>;
  } = $props();

  let root: HTMLDivElement | undefined = $state();

  onMount(() => {
    const options: DockviewWindowManagerOptions = { storageKey, defaultLayout };
    manager = new DockviewWindowManager(context, windowRegistry, options);
    manager.attach(root!);
  });

  onDestroy(() => {
    manager?.destroy();
  });
</script>

<div class="relative w-full h-full flex flex-1 flex-col">
  <div
    class="absolute top-2 bottom-2 left-2 right-2"
    bind:this={root}
  ></div>
</div>
