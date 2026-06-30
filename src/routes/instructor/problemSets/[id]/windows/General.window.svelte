<script lang="ts">
  import { arrayToHashMap } from '$lib/utils/arrayToHashMap';
  import SearchIcon from '@iconify-svelte/fa6-solid/magnifying-glass';
  import type { ProblemSetEditorWindowContext } from '../context.svelte';
  import Editor from '$lib/components/Editor.svelte';

  let { context }: { context: ProblemSetEditorWindowContext } = $props();

  let subjectTags = $derived(context.tags.filter((t) => t.type === 'SubjectTag'));
  let tagsMap = $derived(arrayToHashMap(context.tags, (t) => t.id));

  let currentSubjectName = $derived(
    context.problemSet.subject_id ? tagsMap[context.problemSet.subject_id].label : 'Other'
  );

  let tagSearch = $state('');
  let tagsSearched = $derived(subjectTags.filter((t) => t.label.toLowerCase().includes(tagSearch)));

  const selectTag = (id: string) => () => {
    context.problemSet.subject_id = id;
    (document.activeElement as HTMLDivElement | null)?.blur();
  };
</script>

<section class="flex flex-col gap-4">
  <div class="form-control w-full">
    <label
      for="window__general__problem_set_title"
      class="label"
    >
      <span class="label-text">Problem Set Title</span>
    </label>
    <input
      id="window__general__problem_set_title"
      type="text"
      class="input input-bordered w-full"
      bind:value={context.problemSet.title}
    />
  </div>

  <div class="form-control w-full">
    <label
      for="window__general__problem_set_subject"
      class="label"
    >
      <span class="label-text">Course Assignment</span>
    </label>
    <div class="dropdown block">
      <div
        tabindex="0"
        role="button"
        id="window__general__problem_set_subject"
        class="btn m-1"
      >
        {currentSubjectName}
      </div>
      <ul
        tabindex="-1"
        class="dropdown-content menu bg-base-100 rounded-box z-1 w-64 p-2 shadow-sm"
      >
        <label class="input">
          <SearchIcon class="w-4 h-4" />
          <input bind:value={tagSearch} />
        </label>
        {#if tagsSearched.length > 0}
          {#each tagsSearched as tag (tag.id)}
            <li>
              <button onclick={selectTag(tag.id)}>
                {tag.label}
              </button>
            </li>
          {/each}
        {:else}
          <div class="w-full p-4 text-center">
            Unable to find any subjects. Try narrowing your search.
          </div>
        {/if}
      </ul>
    </div>
  </div>

  <div class="form-control w-full">
    <div class="label">
      <span class="label-text">Description</span>
    </div>
    <Editor bind:text={context.problemSet.description!} />
  </div>
</section>
