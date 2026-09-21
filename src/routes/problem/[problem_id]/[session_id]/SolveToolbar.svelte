<script lang="ts">
  import type { User } from '@auth/sveltekit';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import WorkspaceToolbar, { type ToolbarLink } from '$lib/components/layout/WorkspaceToolbar.svelte';
  import PlayIcon from '@iconify-svelte/fa6-solid/play';
  import PaperPlaneIcon from '@iconify-svelte/fa6-solid/paper-plane';
  import { problemHref, problemSetHref } from '$lib/navigation';
  import type { ProblemLink } from '$lib/problem';
  import type { SolveWindowContext } from './context.svelte';

  let {
    context,
    user,
    neighbors
  }: {
    context: SolveWindowContext;
    user: User;
    /** The problems either side of this one in its set; `null` at either end. */
    neighbors: { previous: ProblemLink | null; next: ProblemLink | null };
  } = $props();

  /** Stepping lands the student in the sibling problem's own solve view. */
  const toStep = (problem: ProblemLink | null): ToolbarLink | null =>
    problem && { href: problemHref(problem.id), name: problem.name };

  const steps = $derived({
    previous: toStep(neighbors.previous),
    next: toStep(neighbors.next)
  });
</script>

<WorkspaceToolbar
  {user}
  backHref={problemSetHref(context.problem.problem_set_id)}
  neighbors={steps}
>
  <!-- Primary actions. Both lock while a run is in flight; the editor panel
       shows the accompanying spinner overlay. -->
  {#snippet actions()}
    <Button
      class="btn-sm gap-2"
      onclick={() => context.run()}
      disabled={context.editorState.locked}
    >
      <PlayIcon
        class="h-3.5 w-3.5"
        aria-hidden="true"
      />
      Run
    </Button>
    <Button
      class="btn-sm btn-primary gap-2"
      onclick={() => context.submit()}
      disabled={context.editorState.locked}
    >
      <PaperPlaneIcon
        class="h-3.5 w-3.5"
        aria-hidden="true"
      />
      Submit
    </Button>
  {/snippet}
</WorkspaceToolbar>
