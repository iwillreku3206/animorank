<script lang="ts">
  import Editor from '$lib/components/editor/Editor.svelte';
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import Select from '$lib/components/ui/selects/Select.svelte';
  import Checkbox from '$lib/components/ui/checkboxes/Checkbox.svelte';
  import ClickableBadge from '$lib/components/ui/badges/ClickableBadge.svelte';
  import SearchIcon from '@iconify-svelte/fa6-solid/magnifying-glass';
  import { arrayToHashMap } from '$lib/utils/arrayToHashMap';
  import type { ProblemSetEditorWindowContext } from '../context.svelte';

  let { context }: { context: ProblemSetEditorWindowContext } = $props();

  const tagsMap = $derived(arrayToHashMap(context.tags, (t) => t.id));
  const subjectTags = $derived(context.tags.filter((t) => t.type === 'SubjectTag'));
  const difficultyTags = $derived(context.tags.filter((t) => t.type === 'DifficultyTag'));
  const topicTags = $derived(context.tags.filter((t) => t.type === 'TopicTag'));

  // `?.` guards a subject id whose tag is missing from the loaded set; the
  // first draft indexed straight into the map and threw.
  const currentSubjectName = $derived(
    context.problemSet.subject_id ? (tagsMap[context.problemSet.subject_id]?.label ?? 'Other') : 'Other'
  );

  let subjectSearch = $state('');
  const subjectsSearched = $derived(
    // Both sides lowercased — the first draft compared against the raw query, so
    // any capital letter in the search box matched nothing.
    subjectTags.filter((t) => t.label.toLowerCase().includes(subjectSearch.toLowerCase()))
  );

  const selectSubject = (id: string) => () => {
    context.problemSet.subject_id = id;
    (document.activeElement as HTMLElement | null)?.blur();
  };

  function toggleTopic(topicId: string) {
    context.topics = context.topics.includes(topicId)
      ? context.topics.filter((t) => t !== topicId)
      : [...context.topics, topicId];
  }
</script>

<section class="flex flex-col gap-4 p-4">
  <div class="form-control w-full">
    <label
      class="label"
      for="window__general__title"
    >
      <span class="label-text font-bold">Problem Set Title</span>
    </label>
    <TextInput
      id="window__general__title"
      type="text"
      class="input-bordered w-full"
      bind:value={context.problemSet.title}
    />
  </div>

  <div class="form-control w-full">
    <!-- Not a <label for>: the trigger is a div[role=button], which a label
         cannot be associated with. The button names itself instead. -->
    <div
      class="label"
      id="window__general__subject_label"
    >
      <span class="label-text font-bold">Course Assignment</span>
    </div>
    <div class="dropdown block">
      <div
        tabindex="0"
        role="button"
        class="btn m-1"
        aria-labelledby="window__general__subject_label"
      >
        {currentSubjectName}
      </div>
      <ul
        tabindex="-1"
        class="dropdown-content menu bg-base-100 rounded-box z-1 w-64 p-2 shadow-sm"
      >
        <label class="input">
          <SearchIcon class="w-4 h-4" />
          <input
            bind:value={subjectSearch}
            aria-label="Search subjects"
          />
        </label>
        {#if subjectsSearched.length > 0}
          {#each subjectsSearched as tag (tag.id)}
            <li>
              <button onclick={selectSubject(tag.id)}>
                {tag.label}
              </button>
            </li>
          {/each}
        {:else}
          <div class="w-full p-4 text-center">Unable to find any subjects. Try narrowing your search.</div>
        {/if}
      </ul>
    </div>
  </div>

  <div class="form-control w-full">
    <label
      class="label"
      for="window__general__difficulty"
    >
      <span class="label-text font-bold">Difficulty</span>
    </label>
    <Select
      id="window__general__difficulty"
      class="select-bordered w-full"
      bind:value={context.problemSet.difficulty_id}
    >
      <option value={null}>None</option>
      {#each difficultyTags as tag (tag.id)}
        <option value={tag.id}>{tag.label}</option>
      {/each}
    </Select>
  </div>

  <div class="form-control w-full">
    <div class="label"><span class="label-text font-bold">Topics</span></div>
    <div class="flex flex-wrap gap-2">
      {#each topicTags as tag (tag.id)}
        <ClickableBadge
          class={context.topics.includes(tag.id) ? 'badge-primary' : 'badge-ghost'}
          aria-pressed={context.topics.includes(tag.id)}
          onclick={() => toggleTopic(tag.id)}
        >
          {tag.label}
        </ClickableBadge>
      {/each}
    </div>
  </div>

  <div class="form-control w-full">
    <Checkbox bind:checked={context.problemSet.auto_accept}>Auto-accept submissions</Checkbox>
  </div>

  <div class="form-control w-full">
    <Checkbox bind:checked={context.problemSet.is_global}>Global (visible to all students)</Checkbox>
  </div>

  <div class="form-control w-full">
    <div class="label"><span class="label-text font-bold">Description</span></div>
    <Editor bind:text={context.problemSet.description} />
  </div>
</section>
