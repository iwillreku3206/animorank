<script lang="ts">
  import Badge from './badges/Badge.svelte';
  import StarIcon from '@iconify-svelte/fa6-solid/star';

  /**
   * Marks a problem set as curated onto the front of the catalogue. Featured
   * sets lead the *default* listing only, so this badge is also the explanation
   * for why such a set sits above its neighbours before any sort is picked.
   *
   * Shared by the student and instructor cards and list items so the wording,
   * icon and aria text are defined once.
   */
  let { class: className = '' }: { class?: string } = $props();
</script>

<Badge
  class="badge-sm badge-primary gap-1 {className}"
  aria-label="Featured problem set"
>
  <StarIcon
    class="h-3 w-3"
    aria-hidden="true"
  />
  Featured
</Badge>
