<script lang="ts">
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  let props: HTMLAnchorAttributes = $props();

  let { class: className, children, ...rest } = $derived(props);
</script>

<a
  class="btn bg-primary text-primary-content px-4 py-3 {className}"
  {...rest}>{@render children?.()}</a
>
