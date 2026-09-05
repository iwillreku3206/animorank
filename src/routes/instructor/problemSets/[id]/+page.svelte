<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import transform from '@diplodoc/transform';
  import { transform as latex } from '@diplodoc/latex-extension/plugin';
  import { transform as mermaid } from '@diplodoc/mermaid-extension/plugin';
  import { transform as transformHTML } from '@diplodoc/html-extension';
  import defaultPlugins from '@diplodoc/transform/lib/plugins';
  import { browser } from '$app/environment';
  import YfmStaticView from '$lib/components/content/YfmStaticView.svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import { arrayToHashMap } from '$lib/utils/arrayToHashMap';
  import type { Window } from '$lib/window';
  import ProblemListItem from './ProblemListItem.svelte';
  import { ProblemSetEditorWindowRegistry } from './windowRegistry';
  import { ProblemSetEditorWindowContext } from './context.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  if (browser) {
    import('@diplodoc/latex-extension/runtime');
  }

  const windowRegistry = new ProblemSetEditorWindowRegistry();

  // Declared, not derived from the window map's insertion order — the tab strip
  // reordered itself whenever the open calls were reordered. Titles come from
  // the window statics, which are safe to read before the windows are built.
  const TAB_IDS = ['general', 'collaborators', 'student_access', 'analytics'];
  const tabs = TAB_IDS.map((id) => ({ id, title: windowRegistry.getStatic(id).title }));

  // svelte-ignore state_referenced_locally
  // The context is seeded once from the initial load and owns its state from
  // then on; it deliberately does not track later `data` changes.
  let context = $state(
    new ProblemSetEditorWindowContext({
      problemSet: {
        id: data.problemSet.id,
        title: data.problemSet.title,
        description: data.problemSet.description,
        auto_accept: data.problemSet.auto_accept,
        is_global: data.problemSet.is_global,
        subject_id: data.problemSet.subject_id,
        difficulty_id: data.problemSet.difficulty_id
      },
      problems: data.problemSet.problems.map((problem) => ({
        id: problem.id,
        name: problem.name,
        visible: problem.visible,
        difficulty_id: problem.difficulty_id ?? null,
        topics: problem.topics
      })),
      topics: data.problemSet.topic_ids,
      collaborators: data.problemSet.collaboratorIds,
      tags: data.tags
    })
  );

  let activeTab = $state('general');

  // Windows mount into detached elements, so they can only be built in the
  // browser. The tab strip renders from `tabs` regardless, so the content area
  // is briefly empty rather than the whole panel showing a loading string.
  let windowMap: Record<string, Window<ProblemSetEditorWindowContext>> = $state({});

  const tagsMap = $derived(arrayToHashMap(context.tags, (t) => t.id));

  const subjectLabel = $derived(
    context.problemSet.subject_id ? (tagsMap[context.problemSet.subject_id]?.label ?? 'Other') : 'Other'
  );

  const descriptionHtml = $derived(
    transform(context.problemSet.description || '', {
      allowHTML: true,
      plugins: [
        latex({ bundle: false, runtime: 'extension:latex' }),
        mermaid({ bundle: false, runtime: 'extension:mermaid' }),
        transformHTML({ bundle: false, runtimeJsPath: 'extension:html' }),
        ...defaultPlugins
      ]
    }).result.html
  );

  const STATUS_LABELS: Record<string, string> = {
    hold: 'Unsaved changes',
    saving: 'Saving…',
    saved: 'Saved',
    error: 'Failed to save'
  };

  onMount(() => {
    for (const { id } of tabs) {
      windowMap[id] = windowRegistry.getInstance(id, context);
    }
  });

  onDestroy(() => {
    // The first draft never tore these down, leaking a mounted component tree
    // and a live effect root per visit.
    for (const window of Object.values(windowMap)) {
      window.destroy();
    }
    context.cleanup();
  });
</script>

<main class="flex h-full w-full gap-4 overflow-hidden p-4">
  <!-- Left panel: metadata tabs -->
  <div class="flex w-1/2 min-w-0 flex-col">
    <div class="mb-4 flex items-start justify-between gap-4">
      <div class="min-w-0">
        <div class="mb-2 text-sm text-base-content/50">
          <a
            class="hover:text-primary"
            href="/instructor/problemSets">Problem sets</a
          >
          <span class="mx-1">/</span>
          <span class="text-primary">{subjectLabel}</span>
        </div>
        <h1 class="mb-2 font-display text-4xl font-bold">{context.problemSet.title}</h1>
        <div class="text-base-content/70">
          <YfmStaticView html={descriptionHtml} />
        </div>
      </div>
      <span
        class="shrink-0 text-sm {context.autosaveStatus === 'error' ? 'text-error' : 'text-base-content/70'}"
        role="status"
      >
        {STATUS_LABELS[context.autosaveStatus]}
      </span>
    </div>

    <div
      class="tabs tabs-lifted tabs-bordered mb-4"
      role="tablist"
    >
      {#each tabs as tab (tab.id)}
        <button
          class="tab"
          class:tab-active={activeTab === tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onclick={() => (activeTab = tab.id)}
        >
          {tab.title}
        </button>
      {/each}
    </div>

    <div class="flex-1 overflow-y-auto">
      {#if windowMap[activeTab]}
        <div {@attach windowMap[activeTab].getAttachment()}></div>
      {/if}
    </div>
  </div>

  <!-- Right panel: problems -->
  <div class="flex w-1/2 min-w-0 flex-col gap-3 overflow-y-auto">
    {#each context.problems as problem (problem.id)}
      <ProblemListItem
        {problem}
        problemSolvers={data.globalProblemSolvers[problem.id]}
        problemAttempts={data.globalProblemAttempts[problem.id]}
        tagMap={tagsMap}
        onDelete={() => context.deleteProblem(problem.id)}
        onToggleVisible={(visible) => context.setProblemVisible(problem.id, visible)}
      />
    {:else}
      <div class="py-8 text-center text-base-content/50">No problems yet</div>
    {/each}

    <Button
      class="btn-outline btn-secondary mt-2 w-full"
      onclick={() => context.addProblem()}
    >
      + Add New Problem
    </Button>
  </div>
</main>
