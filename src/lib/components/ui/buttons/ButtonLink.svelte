<script lang="ts">
  import Button, { type ButtonProps } from './Button.svelte';

  // Thin wrapper: an anchor-flavoured Button. All styling lives in Button, which
  // renders an <a> whenever `href` is provided.
  let props: ButtonProps = $props();
</script>

<Button {...props} />
