<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import { browser } from '$app/environment';
  import { type monaco } from '$lib/monaco';
  import {
    BASE_MONACO_OPTIONS,
    editorSettings,
    toMonacoEditorOptions,
    toMonacoModelOptions
  } from '$lib/editor/settings.svelte';
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

  const language = untrack(() => options.language ?? 'c');

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
  let monacoApi = $state<monaco>();
  let model: monaco.editor.ITextModel | undefined;
  let changeHook: monaco.IDisposable | undefined;
  let cursorHook: monaco.IDisposable | undefined;

  onMount(() => {
    if (!browser) return;
    void import('$lib/monaco').then((module) => (monacoApi = module.monaco));
  });

  /**
   * Create the editor as soon as both the module and the container exist.
   * Creating it inside the import callback instead meant a component whose
   * container was not bound yet (mounting while detached, e.g. a window built
   * before its panel is attached) bailed out and showed "Loading Editor..."
   * forever. The `created` flag is deliberately not `$state`: this effect
   * reads it, and a state write would re-run the effect and tear down the
   * editor it just made.
   */
  let created = false;
  $effect(() => {
    const container = editorContainer;
    const loaded = monacoApi;
    if (created || !container || !loaded) return;
    created = true;

    const monacoEditor = loaded.editor.create(container, {
      ...BASE_MONACO_OPTIONS,
      ...toMonacoEditorOptions(editorSettings.current),
      value: currentCode,
      language
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
      if (e.reason === loaded.editor.CursorChangeReason.Undo) {
        undoSignal = true;
        setTimeout(() => {
          undoSignal = false;
        }, 10);
      }
    });

    if (options.useSections) {
      // Legacy behavior: the whole template is shown, but only the slot
      // ranges are editable; edits are written back per-slot.
      const constrained = constrainedEditor(loaded);
      constrained.initializeIn(monacoEditor);
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
      monacoEditor.onDidChangeModelContent(() => {
        if (!editor) return;
        editorState.sections = { ...editorState.sections, body: editor.getValue() };
      });
    }
  });

  onDestroy(() => {
    changeHook?.dispose();
    cursorHook?.dispose();
    editor?.dispose();
    model?.dispose();
  });

  // Live user settings. `editor` is state, so this also runs once the editor
  // finishes mounting; the model options have to be set separately because
  // Monaco ignores tabSize/insertSpaces on the editor instance.
  $effect(() => {
    editor?.updateOptions(toMonacoEditorOptions(editorSettings.current));
    editor?.getModel()?.updateOptions(toMonacoModelOptions(editorSettings.current));
  });

  $effect(() => {
    // Track state changes even before the editor mounts.
    const code = currentCode;
    void slotRanges;

    if (editor && editor.getValue() !== code) {
      const model = editor.getModel();
      if (!model) return;

      if (options.useSections) {
        // External slot updates: route them through the constrained plugin so
        // they survive. A full-range edit spans the non-editable template
        // text and the plugin reverts it as an "outside edit", leaving the
        // editor text stale.
        const sections = parseSlots(options.template, editorState.sections).sections;
        const next: Record<string, string> = {};
        for (const section of sections) {
          next[section.slot.label] = editorState.sections[section.slot.label] ?? '';
        }
        (
          model as unknown as { updateValueInEditableRanges: (_values: Record<string, string>) => void }
        ).updateValueInEditableRanges(next);
        return;
      }

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

<div class="{rest.class} relative w-full h-full min-h-64 overflow-hidden">
  <!-- Monaco measures this layer, and `absolute inset-0` keeps it pinned to the
       host's box: the editor's own DOM never contributes to the host's height,
       so an `automaticLayout` pass can never feed back into the next one (the
       editor resizing its container, which resizes the editor...). -->
  <div
    class="absolute inset-0"
    bind:this={editorContainer}
  ></div>
  {#if !editor}
    <p class="absolute inset-0 content-center text-grey-400">Loading Editor...</p>
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
