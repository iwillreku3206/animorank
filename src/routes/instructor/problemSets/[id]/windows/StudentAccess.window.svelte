<script lang="ts">
  import MemberEditor from './MemberEditor.svelte';
  import type { ProblemSetEditorWindowContext } from '../context.svelte';

  let { context }: { context: ProblemSetEditorWindowContext } = $props();
</script>

<section class="flex flex-col gap-4 p-4">
  <MemberEditor
    id="window__student_access"
    label="Student email"
    description="Students on this list can practise the set's problems, subscribed one account at a time by email. Only registered student accounts can be added."
    placeholder="student@example.com"
    addLabel="Add student"
    emptyLabel="No students have access yet."
    countNoun="student"
    members={context.subscribers}
    onAdd={(email) => context.addSubscriber(email)}
    onRemove={(id) => context.removeSubscriber(id)}
  />
</section>
