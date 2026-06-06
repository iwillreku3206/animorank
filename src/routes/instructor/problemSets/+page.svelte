<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  let problemSets = $state(data.problemSets);
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
    <input
      type="text"
      placeholder="New problem set title"
      bind:value={newTitle}
      class="input w-64"
    />
    <button
      class="btn btn-primary"
      onclick={createProblemSet}
      disabled={creating}
    >
      {creating ? 'Creating...' : 'Create'}
    </button>
  </div>

  {#if error}
    <p class="text-error mb-4">{error}</p>
  {/if}

  {#if problemSets.length === 0}
    <p>No problem sets found.</p>
  {:else}
    <table class="table w-full">
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
              <a
                class="btn btn-sm"
                href="/instructor/problemSets/{ps.id}">Manage</a
              >
              <button
                class="btn btn-sm btn-error"
                onclick={() => deleteProblemSet(ps.id)}
              >
                Delete
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
