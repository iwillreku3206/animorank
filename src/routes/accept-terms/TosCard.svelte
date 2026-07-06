<script lang="ts">
  import type { Snippet } from 'svelte';

  let { checked = $bindable(), children }: { checked: boolean; children: Snippet } = $props();
</script>

<label
  class="flex flex-row items-start gap-4 p-5 cursor-pointer transition-colors hover:bg-base-content/[0.03] has-checked:bg-primary/[0.06]"
>
  <input
    type="checkbox"
    class="checkbox checkbox-primary mt-0.5 shrink-0"
    bind:checked
  />
  <p class="leading-relaxed">
    {@render children()}
  </p>
</label>
