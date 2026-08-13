<script lang="ts">
  import { mount, unmount } from 'svelte';
  import type { TypeValue } from './typeValue.svelte';

  let {
    value,
    onchange
  }: {
    value: TypeValue;
    onchange: () => void;
  } = $props();

  let container: HTMLDivElement | undefined = $state();
  let mounted: ReturnType<typeof mount> | undefined;

  $effect(() => {
    const el = container;
    if (!el) return;

    // Clean up previous mount
    if (mounted) {
      unmount(mounted);
      mounted = undefined;
    }

    const component = value.type.valueForm;
    if (!component) return;

    mounted = mount(component, {
      target: el,
      props: {
        get value() {
          return value;
        },
        set value(_v: TypeValue) {
          // The editor mutates value in place via bindable,
          // we just need to notify parent of the change
          onchange();
        }
      }
    });
  });
</script>

<div
  bind:this={container}
  class="w-full"
></div>
