<script lang="ts">
  import { untrack } from 'svelte';
  import type { PageProps } from './$types';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';

  let { data }: PageProps = $props();

  let problemSets = $state(untrack(() => data.problemSets));
  let creating = $state(false);
  let newTitle = $state('');
  let error = $state('');

  async function createProblemSet() {
    if (!newTitle.trim()) return;
    error = '';
    creating = true;

    const res = await fetch('/api/problem-set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim() })
    });

    if (res.ok) {
      const json = await res.json();
      window.location.href = `/instructor/problemSets/${json.id}`;
    } else {
      error = await res.text();
    }

    creating = false;
  }

  async function deleteProblemSet(id: string) {
    if (!confirm('Delete this problem set?')) return;

    const res = await fetch(`/api/problem-set/${id}`, { method: 'DELETE' });
    if (res.ok) {
      problemSets = problemSets.filter((ps) => ps.id !== id);
    }
  }
</script>

<div class="p-4">
  <h1 class="text-2xl font-bold mb-4">Instructor — Problem Sets</h1>

  <div class="flex gap-2 mb-6">
    <TextInput
      type="text"
      placeholder="New problem set title"
      bind:value={newTitle}
      class="w-64"
    />
    <Button
      class="btn-primary"
      onclick={createProblemSet}
      disabled={creating}
    >
      {creating ? 'Creating...' : 'Create'}
    </Button>
  </div>

  {#if error}
    <p class="text-error mb-4">{error}</p>
  {/if}

  {#if problemSets.length === 0}
    <p>No problem sets found.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="table w-full min-w-[32rem]">
        <thead>
          <tr>
            <th>Title</th>
            <th>Problems</th>
            <th>Global</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each problemSets as ps (ps.id)}
            <tr>
              <td>
                <a
                  class="link link-primary"
                  href="/instructor/problemSets/{ps.id}"
                >
                  {ps.title}
                </a>
              </td>
              <td>{ps.problemCount}</td>
              <td>{ps.is_global ? 'Yes' : 'No'}</td>
              <td class="flex gap-2">
                <ButtonLink
                  class="btn-sm"
                  href="/instructor/problemSets/{ps.id}">Manage</ButtonLink
                >
                <Button
                  class="btn-sm btn-error"
                  onclick={() => deleteProblemSet(ps.id)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
