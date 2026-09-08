<script lang="ts">
  import CodeEditor from '$lib/components/editor/CodeEditor.svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import Spinner from '@iconify-svelte/fa6-solid/spinner';
  import RotateLeftIcon from '@iconify-svelte/fa6-solid/rotate-left';
  import type { monaco } from '$lib/monaco';
  import { editorSettings } from '$lib/editor/settings.svelte';
  import type { SolveWindowContext } from '../context.svelte';

  let { context }: { context: SolveWindowContext } = $props();

  let handleReset = $state(() => {});
  let monacoInstance = $state<monaco.editor.IStandaloneCodeEditor>();
  let cursor = $state({ lineNumber: 1, column: 1 });

  const SAVE_LABELS = {
    error: { text: 'Save failed', class: 'text-error' },
    saving: { text: 'Saving...', class: 'text-warning' },
    hold: { text: 'Unsaved changes', class: 'text-base-content/50' },
    saved: { text: 'Saved', class: 'text-success' }
  } as const;

  let saveLabel = $derived(SAVE_LABELS[context.saveState]);

  // Monaco owns the cursor, so the position is mirrored into local state rather
  // than read during render. `onDidChangeModel` covers Reset Code, which swaps
  // in a fresh model and snaps the cursor back to the start.
  $effect(() => {
    const editor = monacoInstance;
    if (!editor) return;

    const sync = () => {
      const position = editor.getPosition();
      if (position) {
        cursor = { lineNumber: position.lineNumber, column: position.column };
      }
    };

    sync();
    const disposables = [editor.onDidChangeCursorPosition(sync), editor.onDidChangeModel(sync)];
    return () => disposables.forEach((disposable) => disposable.dispose());
  });

  // Feed editor activity into this session's telemetry (the collated entries
  // are flushed into the session history by the context whenever it saves).
  $effect(() => {
    const editor = monacoInstance;
    if (!editor) return;
    context.telemetry.attachMonaco(editor);
    return () => context.telemetry.unmountMonaco();
  });

  // Matches VS Code: real tabs are reported as a tab width, not as spaces.
  let indentLabel = $derived(
    `${editorSettings.current.insertSpaces ? 'Spaces' : 'Tab Size'}: ${editorSettings.current.tabSize}`
  );
</script>

<div class="flex flex-col h-full w-full">
  <div class="flex h-8 shrink-0 flex-row items-center justify-end border-b border-base-100 bg-base-200 px-1.5">
    <Button
      type="button"
      class="btn-ghost btn-xs btn-square"
      onclick={() => confirm('Reset code? This action cannot be undone.') && handleReset()}
      title="Reset code"
      aria-label="Reset code"
    >
      <RotateLeftIcon class="h-3.5 w-3.5" />
    </Button>
  </div>

  <div class="relative flex-1 min-h-0">
    <CodeEditor
      bind:monacoInstance
      bind:code={context.editorState.code}
      language={context.language}
      useSlots={context.useSlots}
      bind:codeSections={context.editorState.codeSections}
      slots={context.slots}
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

  <div
    class="flex h-8 shrink-0 flex-row items-center justify-between gap-4 border-t border-base-100 bg-base-200 px-3 text-xs"
  >
    <span
      class={saveLabel.class}
      aria-live="polite"
    >
      {saveLabel.text}
    </span>

    <div class="flex flex-row items-center gap-4 text-base-content/70 tabular-nums">
      <span>Ln {cursor.lineNumber}, Col {cursor.column}</span>
      <span>{indentLabel}</span>
    </div>
  </div>
</div>
