<script lang="ts">
  import type { ProblemSetEditorWindowContext } from '../context.svelte';

  // The prop is declared so the component satisfies `Component<{ context }>`,
  // which the window registry requires; the stub has nothing to read from it yet.
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  let { context }: { context: ProblemSetEditorWindowContext } = $props();
</script>

<section class="flex flex-col gap-4 p-4">TODO: Implement</section>
