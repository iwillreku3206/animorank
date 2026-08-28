<script lang="ts">
  import CodeEditor from '$lib/components/editor/CodeEditor.svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import Spinner from '@iconify-svelte/fa6-solid/spinner';
  import type { SolveWindowContext } from '../context.svelte';

  let { context }: { context: SolveWindowContext } = $props();

  let handleReset = $state(() => {});

  // Alongside the test cases window when it is open, otherwise below the editor.
  const openCustomCode = async () => {
    await context.openWindow('custom_code', [
      { direction: 'right', referencePanel: 'test_cases' },
      { direction: 'below', referencePanel: 'code_editor' }
    ]);
  };
</script>

<div class="flex flex-col h-full w-full">
  <div class="flex flex-row p-2">
    <div class="flex flex-row gap-2 ml-auto">
      <Button
        class="btn-sm"
        onclick={openCustomCode}
      >
        Custom Input
      </Button>
      <Button
        class="btn-sm"
        onclick={() => confirm('Reset code? This action cannot be undone.') && handleReset()}>Reset Code</Button
      >
      <Button
        class="btn-sm"
        onclick={() => context.run()}
        disabled={context.editorState.locked}>Run</Button
      >
      <Button
        class="btn-sm"
        onclick={() => context.submit()}
        disabled={context.editorState.locked}>Submit</Button
      >
    </div>
  </div>

  <div class="relative flex-1 min-h-0">
    <CodeEditor
      bind:code={context.editorState.code}
      language={context.language}
      useSlots={context.useSlots}
      bind:codeSections={context.editorState.codeSections}
      slots={context.problem.getSlots()}
      bind:locked={context.editorState.locked}
      resetCode={context.problem.getProcessedCode()}
      resetSlots={context.problem.getSlots()}
      resetSections={Object.fromEntries(
        context.problem.getDefaultSections().map((section) => [section.slot.label, section.code])
      )}
      registerReset={(cb) => (handleReset = cb)}
    />
    {#if context.editorState.locked && !context.testSubmitted}
      <div class="absolute inset-0 bg-base-200 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
        <Spinner class="w-10 h-10 text-base-content animate-spin" />
      </div>
    {/if}
  </div>
</div>
