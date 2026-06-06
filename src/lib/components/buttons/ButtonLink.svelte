<script lang="ts">
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  let props: HTMLAnchorAttributes = $props();

  let { class: className, children, ...rest } = $derived(props);
</script>

<a
  class="btn shadow-none active:shadow-none font-medium rounded {className}"
  {...rest}>{@render children?.()}</a
>
