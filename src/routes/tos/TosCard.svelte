<script lang="ts">
  import type { Snippet } from 'svelte';

  let { checked = $bindable(), children }: { checked: boolean; children: Snippet } = $props();
</script>

<label class="p-8 flex flex-row items-center gap-4 bg-base-100 rounded-lg">
  <input
    type="checkbox"
    class="checkbox checkbox-primary rounded-lg"
    bind:checked
  />
  <p>
    {@render children()}
  </p>
</label>
