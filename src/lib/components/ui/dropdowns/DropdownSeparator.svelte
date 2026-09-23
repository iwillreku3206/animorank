<script lang="ts">
  import { DropdownMenu } from 'bits-ui';

  let { class: className }: { class?: string } = $props();
</script>

<DropdownMenu.Separator class="-mx-1.5 my-1.5 h-px bg-base-content/10 {className}" />
