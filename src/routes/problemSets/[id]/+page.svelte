<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const { problemSet, bookmarked } = $derived(data);
</script>

<main class="px-4 xl:px-32 pt-4 flex flex-col gap-8">
  <p>
    Courses / {#if problemSet.subject}
      <a
        class="text-primary"
        href="/problemSets?tag={problemSet.subject.id}"
      >
        {problemSet.subject?.label}
      </a>
    {:else}
      Other
    {/if}
  </p>
</main>

<pre>
  {JSON.stringify(data, null, 2)}
</pre>
