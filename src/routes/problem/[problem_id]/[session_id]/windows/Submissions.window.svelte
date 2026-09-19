<script lang="ts">
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import CheckIcon from '@iconify-svelte/fa6-solid/check';
  import XmarkIcon from '@iconify-svelte/fa6-solid/xmark';
  import ChevronLeftIcon from '@iconify-svelte/fa6-solid/chevron-left';
  import ClockRotateLeftIcon from '@iconify-svelte/fa6-solid/clock-rotate-left';
  import {
    fetchSubmission,
    fetchSubmissions,
    type SubmissionDetail,
    type SubmissionSummary
  } from '$lib/submission/api';
  import type { SolveWindowContext } from '../context.svelte';

  let { context }: { context: SolveWindowContext } = $props();

  let submissions = $state<SubmissionSummary[]>([]);
  let hasMore = $state(false);
  let listError = $state<string | null>(null);
  /**
   * Pagination failures are held apart from `listError`, which stands in place
   * of the list. The pages already loaded are still good, so a failed request
   * for the next one belongs beside the button that asked for it.
   */
  let moreError = $state<string | null>(null);
  let loading = $state(true);
  let loadingMore = $state(false);

  let selected = $state<SubmissionDetail | null>(null);
  let selectedId = $state<string | null>(null);
  let detailError = $state<string | null>(null);

  const problemId = $derived(context.problem.id);

  /** Reloads the first page on mount, and again whenever a Submit lands. */
  $effect(() => {
    void reload();
  });

  async function reload() {
    // Read synchronously so the enclosing effect subscribes to the counter, and
    // keep the value to recognise our own response as stale further down.
    const version = context.submissionsVersion;

    loading = true;
    listError = null;
    moreError = null;
    try {
      const page = await fetchSubmissions(problemId);
      // A newer Submit landed while this request was in flight. Its reload will
      // deliver fresher rows, so this response is dropped rather than applied.
      if (version !== context.submissionsVersion) return;
      submissions = page.submissions;
      hasMore = page.hasMore;
    } catch (error) {
      listError = error instanceof Error ? error.message : 'Failed to load submissions';
    } finally {
      if (version === context.submissionsVersion) loading = false;
    }
  }

  async function loadMore() {
    const last = submissions.at(-1);
    if (!last || loadingMore) return;

    loadingMore = true;
    moreError = null;
    try {
      const page = await fetchSubmissions(problemId, { before: last.created_at });
      submissions = [...submissions, ...page.submissions];
      hasMore = page.hasMore;
    } catch (error) {
      moreError = error instanceof Error ? error.message : 'Failed to load more submissions';
    } finally {
      loadingMore = false;
    }
  }

  async function open(summary: SubmissionSummary) {
    selectedId = summary.id;
    selected = null;
    detailError = null;
    try {
      const detail = await fetchSubmission(problemId, summary.id);
      // A second click while this was in flight wins, so drop a stale response.
      if (selectedId === summary.id) selected = detail;
    } catch (error) {
      // Same staleness guard as the success path above: without it a slow
      // failure for one submission lands on whichever one is open by then, and
      // `detailError` outranks `selected` in the template.
      if (selectedId !== summary.id) return;
      detailError = error instanceof Error ? error.message : 'Failed to load this submission';
    }
  }

  function back() {
    selectedId = null;
    selected = null;
    detailError = null;
  }

  const absolute = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

  const RELATIVE_STEPS: [limit: number, seconds: number, unit: Intl.RelativeTimeFormatUnit][] = [
    [60, 1, 'second'],
    [3600, 60, 'minute'],
    [86400, 3600, 'hour'],
    [604800, 86400, 'day'],
    [2629800, 604800, 'week'],
    [31557600, 2629800, 'month'],
    [Infinity, 31557600, 'year']
  ];

  function relative(iso: string): string {
    const elapsed = (Date.now() - new Date(iso).getTime()) / 1000;
    if (elapsed < 45) return 'just now';

    const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const step = RELATIVE_STEPS.find(([limit]) => elapsed < limit) ?? RELATIVE_STEPS[RELATIVE_STEPS.length - 1];
    return format.format(-Math.round(elapsed / step[1]), step[2]);
  }
</script>

{#snippet verdict(submission: SubmissionSummary)}
  <span
    class="inline-flex items-center gap-1.5 text-sm font-medium {submission.passed ? 'text-success' : 'text-error'}"
  >
    {#if submission.passed}
      <CheckIcon
        class="h-3.5 w-3.5"
        aria-hidden="true"
      />
      Accepted
    {:else}
      <XmarkIcon
        class="h-3.5 w-3.5"
        aria-hidden="true"
      />
      Failed
    {/if}
  </span>
{/snippet}

<div class="flex h-full flex-col overflow-hidden">
  {#if selectedId}
    <!-- Detail: one attempt's source, read-only. -->
    <div class="flex shrink-0 items-center gap-2 border-b border-base-content/10 px-3 py-2">
      <Button
        class="btn-ghost btn-sm gap-2"
        onclick={back}
      >
        <ChevronLeftIcon
          class="h-3.5 w-3.5"
          aria-hidden="true"
        />
        All submissions
      </Button>
      {#if selected}
        {@render verdict(selected)}
        <span class="ml-auto text-xs text-base-content/60">{absolute(selected.created_at)}</span>
      {/if}
    </div>

    <div class="flex-1 overflow-y-auto p-3">
      {#if detailError}
        <p class="text-sm text-error">{detailError}</p>
      {:else if !selected}
        <p class="text-sm text-base-content/60">Loading submission…</p>
      {:else}
        <p class="mb-3 text-sm text-base-content/70">
          {selected.tests_passed} of {selected.tests_total} tests passed
        </p>
        <!-- The assembled program, not the raw sections: on a slots problem the
             sections alone are fragments with none of the surrounding template. -->
        <pre class="overflow-x-auto rounded-lg bg-base-200 p-3 font-mono text-sm">{selected.full_code}</pre>
      {/if}
    </div>
  {:else}
    <!-- List: every attempt at this problem, newest first, across all sessions. -->
    <div class="flex-1 overflow-y-auto">
      {#if loading}
        <p class="p-4 text-sm text-base-content/60">Loading submissions…</p>
      {:else if listError}
        <div class="p-4">
          <p class="mb-2 text-sm text-error">{listError}</p>
          <Button
            class="btn-sm"
            onclick={reload}
          >
            Try again
          </Button>
        </div>
      {:else if submissions.length === 0}
        <div class="grid h-full place-items-center p-6 text-center">
          <div>
            <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-base-200 text-base-content/40">
              <ClockRotateLeftIcon
                class="h-5 w-5"
                aria-hidden="true"
              />
            </div>
            <p class="text-sm font-medium">No submissions yet</p>
            <p class="mt-1 text-xs text-base-content/60">Press Submit and your attempts will show up here.</p>
          </div>
        </div>
      {:else}
        <ul class="divide-y divide-base-content/10">
          {#each submissions as submission (submission.id)}
            <li>
              <button
                type="button"
                class="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-base-200"
                onclick={() => open(submission)}
              >
                {@render verdict(submission)}
                <span class="text-xs text-base-content/60">
                  {submission.tests_passed}/{submission.tests_total} tests
                </span>
                <span
                  class="ml-auto shrink-0 text-xs text-base-content/50"
                  title={absolute(submission.created_at)}
                >
                  {relative(submission.created_at)}
                </span>
              </button>
            </li>
          {/each}
        </ul>

        {#if moreError}
          <p class="px-3 pt-3 text-sm text-error">{moreError}</p>
        {/if}

        {#if hasMore}
          <div class="p-3">
            <Button
              class="btn-ghost btn-sm w-full"
              onclick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading…' : 'Load older submissions'}
            </Button>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>
