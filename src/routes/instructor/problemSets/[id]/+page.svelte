<script lang="ts">
  import type { PageProps } from './$types';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import ClickableBadge from '$lib/components/ui/badges/ClickableBadge.svelte';
  import Editor from '$lib/components/editor/Editor.svelte';

  let { data }: PageProps = $props();

  let problemSet = $state({ ...data.problemSet });
  let tags = data.tags;
  let saving = $state(false);
  let saveMessage = $state('');
  let addingProblem = $state(false);

  const subjectTags = $derived(tags.filter((t) => t.type === 'SubjectTag'));
  const difficultyTags = $derived(tags.filter((t) => t.type === 'DifficultyTag'));
  const topicTags = $derived(tags.filter((t) => t.type === 'TopicTag'));

  function toggleTopic(topicId: string) {
    const idx = problemSet.topic_ids.indexOf(topicId);
    if (idx >= 0) {
      problemSet.topic_ids.splice(idx, 1);
    } else {
      problemSet.topic_ids.push(topicId);
    }
  }

  async function saveProblemSet() {
    saving = true;
    saveMessage = '';

    const res = await fetch(`/api/problem-set/${problemSet.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: problemSet.title,
        description: problemSet.description,
        auto_accept: problemSet.auto_accept,
        is_global: problemSet.is_global,
        subjectId: problemSet.subject_id,
        difficultyId: problemSet.difficulty_id,
        topicIds: problemSet.topic_ids
      })
    });

    saving = false;

    if (res.ok) {
      saveMessage = 'Saved';
      setTimeout(() => (saveMessage = ''), 2000);
    } else {
      saveMessage = `Failed: ${res.status}`;
    }
  }

  async function addProblem() {
    addingProblem = true;

    const res = await fetch('/api/problem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemSet: problemSet.id })
    });

    if (res.ok) {
      const json = await res.json();
      problemSet.problems.push({
        id: json.id,
        name: 'New Problem',
        visible: true,
        created_at: new Date()
      });
    }

    addingProblem = false;
  }

  async function deleteProblem(problemId: string) {
    if (!confirm('Delete this problem?')) return;

    const res = await fetch(`/api/problem/${problemId}`, { method: 'DELETE' });
    if (res.ok) {
      problemSet.problems = problemSet.problems.filter((p) => p.id !== problemId);
    }
  }

  async function toggleVisible(problemId: string, currentVisible: boolean) {
    const res = await fetch(`/api/problem/${problemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: !currentVisible })
    });

    if (res.ok) {
      const problem = problemSet.problems.find((p) => p.id === problemId);
      if (problem) problem.visible = !currentVisible;
    }
  }
</script>

<div class="p-4 max-w-4xl">
  <a
    class="link link-primary mb-4 inline-block"
    href="/instructor/problemSets"
  >
    ← Back to problem sets
  </a>

  <h1 class="text-2xl font-bold mb-6">Manage Problem Set</h1>

  <!-- Problem Set Fields -->
  <div class="form-control mb-8">
    <label
      class="label"
      for="ps-title"><span class="label-text font-bold">Title</span></label
    >
    <TextInput
      id="ps-title"
      type="text"
      bind:value={problemSet.title}
      class="input-bordered w-full"
    />
  </div>

  <div class="form-control mb-4">
    <label class="label"><span class="label-text font-bold">Description</span></label>
    <Editor bind:text={problemSet.description} />
  </div>

  <div class="form-control mb-4">
    <label class="label cursor-pointer justify-start gap-4">
      <input
        type="checkbox"
        bind:checked={problemSet.auto_accept}
        class="checkbox"
      />
      <span class="label-text">Auto-accept submissions</span>
    </label>
  </div>

  <div class="form-control mb-4">
    <label class="label cursor-pointer justify-start gap-4">
      <input
        type="checkbox"
        bind:checked={problemSet.is_global}
        class="checkbox"
      />
      <span class="label-text">Global (visible to all students)</span>
    </label>
  </div>

  <div class="form-control mb-4">
    <label
      class="label"
      for="ps-subject"><span class="label-text font-bold">Subject</span></label
    >
    <select
      id="ps-subject"
      bind:value={problemSet.subject_id}
      class="select select-bordered w-full"
    >
      <option value={null}>None</option>
      {#each subjectTags as tag (tag.id)}
        <option value={tag.id}>{tag.label}</option>
      {/each}
    </select>
  </div>

  <div class="form-control mb-4">
    <label
      class="label"
      for="ps-difficulty"><span class="label-text font-bold">Difficulty</span></label
    >
    <select
      id="ps-difficulty"
      bind:value={problemSet.difficulty_id}
      class="select select-bordered w-full"
    >
      <option value={null}>None</option>
      {#each difficultyTags as tag (tag.id)}
        <option value={tag.id}>{tag.label}</option>
      {/each}
    </select>
  </div>

  <div class="form-control mb-6">
    <div class="label"><span class="label-text font-bold">Topics</span></div>
    <div class="flex flex-wrap gap-2">
      {#each topicTags as tag (tag.id)}
        <ClickableBadge
          class={problemSet.topic_ids.includes(tag.id) ? 'badge-primary' : 'badge-ghost'}
          onclick={() => toggleTopic(tag.id)}
        >
          {tag.label}
        </ClickableBadge>
      {/each}
    </div>
  </div>

  <div class="mb-8">
    <Button
      class="btn-primary"
      onclick={saveProblemSet}
      disabled={saving}
    >
      {saving ? 'Saving...' : 'Save Changes'}
    </Button>
    {#if saveMessage}
      <span class="ml-4 text-sm">{saveMessage}</span>
    {/if}
  </div>

  <!-- Problems -->
  <div class="mb-4 flex items-center justify-between">
    <h2 class="text-xl font-bold">Problems</h2>
    <Button
      class="btn-sm btn-primary"
      onclick={addProblem}
      disabled={addingProblem}
    >
      + Add Problem
    </Button>
  </div>

  {#if problemSet.problems.length === 0}
    <p class="text-sm text-base-content/60 mb-6">No problems yet. Add one to get started.</p>
  {:else}
    <table class="table w-full mb-8">
      <thead>
        <tr>
          <th>Name</th>
          <th>Visible</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each problemSet.problems as problem (problem.id)}
          <tr>
            <td>
              <a
                class="link link-primary"
                href="/edit/{problem.id}"
              >
                {problem.name}
              </a>
            </td>
            <td>
              <label class="cursor-pointer gap-2">
                <input
                  type="checkbox"
                  checked={problem.visible}
                  class="checkbox"
                  onchange={() => toggleVisible(problem.id, problem.visible)}
                />
              </label>
            </td>
            <td class="flex gap-2">
              <ButtonLink
                class="btn-sm"
                href="/edit/{problem.id}">Edit</ButtonLink
              >
              <Button
                class="btn-sm btn-error"
                onclick={() => deleteProblem(problem.id)}
              >
                Delete
              </Button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <!-- Collaborators -->
  <div class="mb-4">
    <h2 class="text-xl font-bold">Collaborators</h2>
  </div>
  <ul class="list-disc pl-6 mb-2">
    {#each problemSet.collaboratorIds as collabId (collabId)}
      <li>User ID: {collabId}</li>
    {/each}
  </ul>
</div>
