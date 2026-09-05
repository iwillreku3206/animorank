<script lang="ts">
  import TagChip from '$lib/components/ui/TagChip.svelte';
  import EyeIcon from '@iconify-svelte/fa6-solid/eye';
  import EyeSlashIcon from '@iconify-svelte/fa6-solid/eye-slash';
  import EllipsisVerticalIcon from '@iconify-svelte/fa6-solid/ellipsis-vertical';
  import PenIcon from '@iconify-svelte/fa6-solid/pen-to-square';
  import TrashIcon from '@iconify-svelte/fa6-solid/trash-can';
  import type { Tag } from '$lib/zenstack/models';
  import type { EditorProblem } from './context.svelte';
  import type { PageProps } from './$types';

  let {
    problem,
    problemSolvers,
    problemAttempts,
    tagMap,
    onDelete,
    onToggleVisible
  }: {
    problem: EditorProblem;
    problemSolvers?: PageProps['data']['globalProblemSolvers'][string];
    problemAttempts?: PageProps['data']['globalProblemAttempts'][string];
    tagMap: Record<string, Tag>;
    onDelete: () => void;
    onToggleVisible: (_visible: boolean) => void;
  } = $props();

  // A tag id with no entry in the map would otherwise reach the keyed `{#each}`
  // as undefined and throw on `tag.id`.
  const tags = $derived(
    [problem.difficulty_id, ...problem.topics].filter((id) => !!id).flatMap((id) => tagMap[id!] ?? [])
  );

  // The aggregates count DISTINCT student_id, so these are people, not runs.
  const studentsAttempted = $derived(parseInt((problemAttempts || [])[0]?.attempts.toString() || '0') || 0);
  const studentsSolved = $derived(parseInt((problemSolvers || [])[0]?.solvers.toString() || '0') || 0);
  const passRate = $derived(studentsSolved / (studentsAttempted || 1));

  // daisyUI dropdowns stay open while focus is inside them, so dismissing means
  // blurring — same approach as TagSelect and the General tab's subject picker.
  // Called before `confirm()` so the menu isn't left hanging behind the dialog.
  const closeMenu = () => (document.activeElement as HTMLElement | null)?.blur();
</script>

<div class="relative flex w-full flex-row gap-8 rounded-lg bg-base-200 px-8 py-4 hover:bg-base-100/70">
  <div class="flex min-w-0 flex-9 flex-col gap-2">
    {#if tags.length > 0}
      <div class="flex flex-row flex-wrap gap-2">
        {#each tags as tag (tag.id)}
          <TagChip {tag} />
        {/each}
      </div>
    {/if}

    <!-- Stretched link: the name is the only anchor, and its ::after covers the
         card so the whole row stays clickable. The first draft made the card a
         div[role=link] with a <button> inside it — invalid nesting, and Enter on
         the delete button fired the confirm *and* navigated, because the keydown
         bubbled to the row's handler. Controls below sit above the ::after. -->
    <h2 class="line-clamp-2 overflow-hidden font-display text-xl font-semibold">
      <a
        class="transition-colors duration-250 after:absolute after:inset-0 hover:text-primary"
        href="/edit/{problem.id}"
      >
        {problem.name}
      </a>
    </h2>

    <div class="flex flex-col gap-2 text-sm text-base-content/70 sm:flex-row sm:items-center">
      <div class="w-full sm:w-48">
        Pass rate: <span class="font-bold text-base-content">{(passRate * 100).toFixed(2)}%</span>
      </div>
      <div class="w-full sm:w-auto">
        Attempted by:
        <span class="font-bold text-base-content">
          {studentsAttempted} student{studentsAttempted === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  </div>

  <div class="relative z-10 flex flex-1 flex-row items-center justify-end gap-1">
    <!-- State toggle rather than an action button: `aria-pressed` lets a screen
         reader announce whether the problem is currently visible, which the
         swapped icon only conveys visually. -->
    <button
      class="btn btn-ghost btn-square"
      aria-label="Visible to students"
      aria-pressed={problem.visible}
      title={problem.visible ? 'Visible to students' : 'Hidden from students'}
      onclick={() => onToggleVisible(!problem.visible)}
    >
      {#if problem.visible}
        <EyeIcon class="h-5 w-5" />
      {:else}
        <EyeSlashIcon class="h-5 w-5 text-base-content/40" />
      {/if}
    </button>

    <div class="dropdown dropdown-end">
      <button
        tabindex={0}
        class="btn btn-ghost btn-square"
        aria-label="More actions for {problem.name}"
      >
        <EllipsisVerticalIcon class="h-5 w-5" />
      </button>
      <div
        tabindex="-1"
        class="dropdown-content z-50 mt-2 w-52 rounded-box border border-base-content/10 bg-base-100 p-1.5 shadow-xl"
      >
        <ul class="flex flex-col gap-0.5">
          <li>
            <a
              class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors outline-none hover:bg-base-200 focus-visible:bg-base-200"
              href="/edit/{problem.id}"
            >
              <PenIcon class="h-4 w-4 opacity-70" />
              Edit problem
            </a>
          </li>
          <li>
            <button
              class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-error transition-colors outline-none hover:bg-base-200 focus-visible:bg-base-200"
              onclick={() => {
                closeMenu();
                if (window.confirm(`Delete "${problem.name}"? This action cannot be undone.`)) {
                  onDelete();
                }
              }}
            >
              <TrashIcon class="h-4 w-4" />
              Delete problem
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>
