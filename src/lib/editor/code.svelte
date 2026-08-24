<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { type monaco } from '$lib/monaco';
  import { DEFAULT_MONACO_THEME } from '$lib/components/editor/themes';
  import { parseSlots } from '$lib/utils/parseSlots';
  import constrainedEditor from 'constrained-editor-plugin';
  import type { CodeEditorOptions, CodeEditorState } from './code';

  // The prop must stay named `state` (EditorComponent contract), but a local
  // binding called `state` breaks the `$state` rune, so alias it here.
  let {
    state: editorState = $bindable(),
    options,
    ...rest
  }: {
    state: CodeEditorState;
    options: CodeEditorOptions;
    class?: string;
  } = $props();

  const language = options.language ?? 'c';

  // Same data as the legacy session editor: the full assembled code (template
  // lines + slot content) for sections problems, or the body section alone.
  const currentCode = $derived(
    options.useSections
      ? parseSlots(options.template, editorState.sections).fullCode
      : (editorState.sections['body'] ?? '')
  );

  // Slot ranges in the assembled code; restrictions are applied only for
  // sections problems (mirrors the legacy StudentCodeEditor).
  const slotRanges = $derived(
    options.useSections
      ? parseSlots(options.template, editorState.sections).sections.map((s) => ({
          range: s.slot.initialRange,
          label: s.slot.label
        }))
      : []
  );

  let editorContainer = $state<HTMLDivElement>();
  let editor: monaco.editor.IStandaloneCodeEditor | undefined = $state();

  onMount(() => {
    if (!browser) return;

    let model: monaco.editor.ITextModel | undefined;
    let changeHook: monaco.IDisposable | undefined;
    let cursorHook: monaco.IDisposable | undefined;
    const init = import('$lib/monaco').then(({ monaco }) => {
      if (!editorContainer) return;
      const monacoEditor = monaco.editor.create(editorContainer, {
        value: currentCode,
        language,
        automaticLayout: true,
        theme: DEFAULT_MONACO_THEME,
        fontFamily: 'DM Mono',
        minimap: { enabled: false },
        wordWrap: 'on',
        wordBasedSuggestions: 'currentDocument',
        bracketPairColorization: { enabled: true }
      });
      editor = monacoEditor;
      model = monacoEditor.getModel() ?? undefined;
      if (!model) return;

      // Ported from the legacy telemetry TextInputHook: the constrained plugin
      // applies an outside edit and instantly undoes it. The revert surfaces
      // as a cursor change with reason `Undo` immediately followed by the
      // undo's content change (a real user undo has the change first). Show
      // Monaco's inline message on that signature.
      let undoSignal = false;

      changeHook = model.onDidChangeContent(() => {
        if (undoSignal) {
          undoSignal = false;
          monacoEditor
            .getContribution('editor.contrib.messageController')
            // @ts-expect-error EditorContributions cannot be type narrowed down
            ?.showMessage('Cannot edit this area', monacoEditor.getPosition());
        }
      });

      cursorHook = monacoEditor.onDidChangeCursorPosition((e) => {
        if (e.reason === monaco.editor.CursorChangeReason.Undo) {
          undoSignal = true;
          setTimeout(() => {
            undoSignal = false;
          }, 10);
        }
      });

      if (options.useSections) {
        // Legacy behavior: the whole template is shown, but only the slot
        // ranges are editable; edits are written back per-slot.
        const constrained = constrainedEditor(monaco);
        constrained.initializeIn(editor);
        constrained.addRestrictionsTo(
          model,
          slotRanges.map(({ range, label }) => ({ range, label, allowMultiline: true }))
        );

        // @ts-expect-error Added by non-TypeScript plugin
        model.toggleHighlightOfEditableAreas({
          cssClassForSingleLine: 'customClass--singleLine',
          cssClassForMultiLine: 'customClass--multiLine'
        });

        // @ts-expect-error Added by non-TypeScript plugin
        model.onDidChangeContentInEditableRange((newCode: Record<string, string>) => {
          editorState.sections = { ...editorState.sections, ...newCode };
        });
      } else {
        editor.onDidChangeModelContent(() => {
          if (!editor) return;
          editorState.sections = { ...editorState.sections, body: editor.getValue() };
        });
      }
    });

    return () => {
      init.then(() => {
        changeHook?.dispose();
        cursorHook?.dispose();
        editor?.dispose();
        model?.dispose();
      });
    };
  });

  $effect(() => {
    // Track state changes even before the editor mounts.
    const code = currentCode;
    void slotRanges;

    if (editor && editor.getValue() !== code) {
      const model = editor.getModel();
      if (!model) return;
      const fullRange = model.getFullModelRange();
      editor.pushUndoStop();
      editor.executeEdits('undoable-reset', [
        {
          range: fullRange,
          text: code
        }
      ]);
      editor.pushUndoStop();
    }
  });
</script>

<div
  class="{rest.class} w-full h-full min-h-64"
  bind:this={editorContainer}
>
  {#if !editor}
    <p class="content-center w-full h-full text-grey-400">Loading Editor...</p>
  {/if}
</div>

<style>
  :global(.customClass--singleLine) {
    padding: 0.25rem;
    background-color: black;
    width: 100% !important;
    opacity: 60%;
  }
  :global(.customClass--multiLine) {
    padding: 0.25rem;
    background-color: black;
    width: 100% !important;
    opacity: 60%;
  }
</style>
