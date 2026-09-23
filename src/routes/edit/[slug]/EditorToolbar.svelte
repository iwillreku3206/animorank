<script lang="ts">
  import type { Session } from '@auth/sveltekit';
  import WorkspaceToolbar, { type ToolbarLink } from '$lib/components/layout/WorkspaceToolbar.svelte';
  import { problemEditHref, problemSetHrefFor } from '$lib/navigation';
  import type { ProblemLink } from '$lib/problem';
  import type { AutoSaveState } from '$lib/utils/autosave.svelte';
  import type { ProblemEditorWindowContext } from './context.svelte';

  let {
    context,
    user,
    neighbors
  }: {
    context: ProblemEditorWindowContext;
    /** The session user rather than the adapter's `User`: the back link reads `type`, which only the session carries. */
    user: Session['user'];
    /** The problems either side of this one in its set; `null` at either end. */
    neighbors: { previous: ProblemLink | null; next: ProblemLink | null };
  } = $props();

  /** Stepping keeps the instructor in the editor rather than dropping them into the solve view. */
  const toStep = (problem: ProblemLink | null): ToolbarLink | null =>
    problem && { href: problemEditHref(problem.id), name: problem.name };

  const steps = $derived({
    previous: toStep(neighbors.previous),
    next: toStep(neighbors.next)
  });

  // The centre zone reports rather than acts: the context autosaves every
  // edit, so there is no save button, and previewing the problem is out --
  // the solve view is student-side and an instructor cannot open it.
  const STATUS_LABELS: Record<AutoSaveState, string> = {
    hold: 'Unsaved changes',
    saving: 'Saving…',
    saved: 'Saved',
    error: 'Failed to save'
  };
</script>

<WorkspaceToolbar
  {user}
  backHref={problemSetHrefFor(user, context.problem.problem_set_id)}
  neighbors={steps}
>
  {#snippet actions()}
    <span
      class="text-sm {context.autosaveStatus === 'error' ? 'text-error' : 'text-base-content/60'}"
      role="status"
    >
      {STATUS_LABELS[context.autosaveStatus]}
    </span>
  {/snippet}
</WorkspaceToolbar>
