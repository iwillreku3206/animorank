<script lang="ts">
  import Tags from 'svelte-tags-input';
  import TagSelect from '$lib/components/TagSelect.svelte';
  import { groupBy } from '$lib/utils/groupBy';
  import type { ProblemEditorWindowContext } from './context.svelte';
  import { arrayToHashMap } from '$lib/utils/arrayToHashMap';

  let { context }: { context: ProblemEditorWindowContext } = $props();

  const tags = $derived(groupBy(context.tags, (t) => t.type));
  const topicTagMap = $derived(arrayToHashMap(tags.TopicTag, (a) => a.id));

  let topics: string[] = $state([]);

  $effect(() => {
    context.topics = topics.map((t) => topicTagMap[t]?.id).filter((x) => !!x);
  });
</script>

<h2 class="text-2xl font-bold">Subject</h2>
<TagSelect
  bind:selectedTagId={context.problem.subject_id}
  tags={tags.SubjectTag}
/>

<h2 class="text-2xl font-bold">Difficulty</h2>
<TagSelect
  bind:selectedTagId={context.problem.difficulty_id}
  tags={tags.DifficultyTag}
/>

<h2 class="text-2xl font-bold">Topics</h2>
<div class="daisy-tags-wrapper w-full">
  <Tags
    bind:tags={topics as []}
    onlyAutocomplete={true}
    autoComplete={tags.TopicTag.map((t) => t.label)}
  />
</div>

<style
  lang="postcss"
  is:global
>
  @reference "../../../app.css";
  /* 1. Make the outer container look like a daisyUI bordered input */
  .daisy-tags-wrapper :global(.svelte-tags-input-layout) {
    @apply input input-primary border-primary flex h-auto min-h-[3rem] flex-wrap items-center gap-1 py-1.5 focus-within:input-primary bg-base-100;
  }

  .daisy-tags-wrapper :global(.svelte-tags-input-layout):hover {
    @apply border-primary;
  }

  /* 2. Strip standard styles from the actual text field so it blends in */
  .daisy-tags-wrapper :global(.svelte-tags-input) {
    @apply m-0 min-w-[80px] flex-1 bg-transparent p-0 text-base-content outline-none;
  }

  /* 3. Style the tags to look like daisyUI badges */
  .daisy-tags-wrapper :global(.svelte-tags-input-tag) {
    @apply badge badge-neutral m-0 gap-1 rounded-sm py-3;
  }

  /* 4. Style the 'x' remove button on the badge */
  .daisy-tags-wrapper :global(.svelte-tags-input-tag-remove) {
    @apply cursor-pointer hover:text-error m-0 ml-1 font-bold;
  }

  /* --- Optional: Autocomplete Dropdown --- */
  .daisy-tags-wrapper :global(.svelte-tags-input-matchs) {
    @apply menu bg-base-200 rounded-box mt-1 w-full border border-base-300 p-2 shadow-lg;
  }

  .daisy-tags-wrapper :global(.svelte-tags-input-matchs-li) {
    @apply rounded-xl hover:bg-base-300 cursor-pointer px-3 py-2 text-base-content;
  }
</style>
