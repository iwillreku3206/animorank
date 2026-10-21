<script lang="ts">
  import MemberEditor from './MemberEditor.svelte';
  import type { ProblemSetEditorWindowContext } from '../context.svelte';

  let { context }: { context: ProblemSetEditorWindowContext } = $props();
</script>

<section class="flex flex-col gap-4 p-4">
  <MemberEditor
    id="window__collaborators"
    label="Teacher email"
    description="Collaborators can edit this set and its problems, add problems, and manage who else has access. Only registered teacher accounts can be added."
    placeholder="teacher@example.com"
    addLabel="Add collaborator"
    emptyLabel="No collaborators yet."
    countNoun="collaborator"
    members={context.collaborators}
    onAdd={(email) => context.addCollaborator(email)}
    onRemove={(id) => context.removeCollaborator(id)}
  />
</section>
