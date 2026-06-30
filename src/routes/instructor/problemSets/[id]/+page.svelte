<script lang="ts">
  import type { PageProps } from './$types';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import ClickableBadge from '$lib/components/ui/badges/ClickableBadge.svelte';
  import { ProblemSetEditorWindowContext } from './context.svelte';
  import ProblemListItem from './ProblemListItem.svelte';
  import BookmarkIcon from '@iconify-svelte/fa6-regular/bookmark';
  import type { ProblemSet, Problem, Tag } from '$lib/zenstack/models';
  import { onMount } from 'svelte';
  import { ProblemSetEditorWindowRegistry } from './windowRegistry';
  import type { Window } from '$lib/window';
  import { arrayToHashMap } from '$lib/utils/arrayToHashMap';
  import YfmStaticView from '$lib/components/YfmStaticView.svelte';

  let { data }: PageProps = $props();

  let context = $state(
    new ProblemSetEditorWindowContext({
      problemSet: data.problemSet as unknown as ProblemSet,
      problems: data.problemSet.problems as unknown as Problem[],
      topics: data.problemSet.topic_ids,
      collaborators: data.problemSet.collaboratorIds,
      students: [],
      tags: data.tags as unknown as Tag[]
    })
  );

  let activeTab = $state('general');

  const windowRegistry = new ProblemSetEditorWindowRegistry();
  let windowMap: Record<string, Window<ProblemSetEditorWindowContext>> = $state({});
  let windows = $derived(Object.keys(windowMap));

  function openWindow(key: string) {
    if (key in windowMap) {
      return windowMap[key];
    }
    windowMap[key] = windowRegistry.getInstance(key, context);
    activeTab = key;
  }

  let tagsMap = $derived(arrayToHashMap(context.tags, (t) => t.id));

  onMount(() => {
    openWindow('general');
    openWindow('collaborators');
    openWindow('student_access');
    openWindow('analytics');

    // default open window
    openWindow('general');
  });
</script>

<main class="w-full h-full flex gap-4 p-4 overflow-hidden">
  <!-- Left panel -->
  <div class="flex flex-col w-1/2 min-w-0">
    <!-- Header -->
    <div class="flex items-start justify-between mb-4">
      <div>
        <div class="text-sm text-base-content/50 mb-2">
          <span>Courses</span> <span class="mx-1">/</span>
          <span class="text-primary"
            >{context.problemSet.subject_id
              ? tagsMap[context.problemSet.subject_id]?.label
              : 'Other'}</span
          >
        </div>
        <h1 class="text-4xl font-bold mb-2">{context.problemSet.title}</h1>

        <YfmStaticView text={context.problemSet.description || ''} />
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-lifted tabs-bordered mb-4">
      {#each windows as win (win)}
        <button
          class:tab-active={activeTab === win}
          class="tab"
          onclick={() => (activeTab = win)}
        >
          {windowMap[win].title}
        </button>
      {/each}
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-y-auto">
      {#if windows.length !== 0}
        <div {@attach windowMap[activeTab].getAttachment()}></div>
      {:else}
        Loading...
      {/if}
    </div>
  </div>

  <!-- Right panel: problem list -->
  <div class="flex flex-col w-1/2 min-w-0 gap-3 overflow-y-auto">
    {#each context.problems as problem (problem.id)}
      <ProblemListItem
        {problem}
        problemSolvers={data.globalProblemSolvers[problem.id]}
        problemAttempts={data.globalProblemAttempts[problem.id]}
        tagMap={tagsMap}
      />
    {:else}
      <div class="text-center text-base-content/50 py-8">No problems yet</div>
    {/each}

    <button class="btn btn-outline btn-secondary w-full mt-2"> + Add New Problem </button>
  </div>
</main>
