<script lang="ts">
  import Badge from '$lib/components/ui/badges/Badge.svelte';
  import { formatLogTimestamp } from '$lib/analytics/sessionLogTime';
  import type { SessionLogsViewContext } from '../context.svelte';

  let { context }: { context: SessionLogsViewContext } = $props();
</script>

{#if context.logs.length === 0}
  <p class="rounded-box bg-base-200 p-8 text-center text-base-content/60">No logs for this session.</p>
{:else}
  <ul class="flex flex-col gap-3">
    {#each context.logs as log (log.id)}
      <li class="rounded-box bg-base-200 p-4">
        <div class="flex flex-wrap items-center gap-3">
          <time
            class="text-sm text-base-content/60"
            datetime={log.timestamp}>{formatLogTimestamp(log.timestamp)}</time
          >
          <Badge class="badge-neutral">{log.type}</Badge>
        </div>
        <pre class="mt-3 max-h-60 overflow-auto rounded-box bg-base-300 p-3 text-xs">{JSON.stringify(
            log.data,
            null,
            2
          )}</pre>
      </li>
    {/each}
  </ul>
{/if}
