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
    // eslint-disable-next-line no-useless-assignment -- the parent's `bind:manager` reads it
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

  // Tracked locally as well: the bindable is published only once the dock
  // exists, so a parent effect cannot hand `openWindow` to a plugin while the
  // manager has nothing to open into.
  let created: DockviewWindowManager<unknown> | undefined;

  onMount(async () => {
    const options: DockviewWindowManagerOptions = { storageKey, defaultLayout };
    created = new DockviewWindowManager(context, windowRegistry, options);
    await created.attach(root!);
    // Published only once the dock exists: `openWindow` is a no-op until then.
    manager = created;
  });

  onDestroy(() => {
    created?.destroy();
  });
</script>

<div class="relative w-full h-full flex flex-1 flex-col">
  <div
    class="absolute top-0 bottom-2 left-2 right-2"
    bind:this={root}
  ></div>
</div>
