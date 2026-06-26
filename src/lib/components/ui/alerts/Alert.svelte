<script
  module
  lang="ts"
>
  import type { HTMLAttributes } from 'svelte/elements';
  export type AlertProps = HTMLAttributes<HTMLDivElement>;
</script>

<script lang="ts">
  let props: AlertProps = $props();

  let { class: className, children, ...rest } = $derived(props);
</script>

<div
  role="alert"
  class="alert {className}"
  {...rest}
>
  {@render children?.()}
</div>
