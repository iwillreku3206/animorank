<script lang="ts">
  import { onMount } from 'svelte';
  import { type monaco } from '$lib/monaco';
  import { browser } from '$app/environment';
  import constrainedEditor from 'constrained-editor-plugin';
  import {
    BASE_MONACO_OPTIONS,
    editorSettings,
    toMonacoEditorOptions,
    toMonacoModelOptions
  } from '$lib/editor/settings.svelte';
  import type { Slot } from '$lib/problem';

  let {
    monacoNamespace = $bindable(undefined),
    monacoInstance = $bindable(undefined),
    monacoModel = $bindable(undefined),
    constrainedInstance = $bindable(undefined),
    code = $bindable(''),
    language,
    useSlots = false,
    slots = [],
    codeSections = $bindable({}),
    locked = $bindable(false),
    resetCode,
    resetSlots = [],
    resetSections = {},
    registerReset,
    ...rest
  }: {
    monacoNamespace?: Promise<typeof monaco | undefined>;
    monacoInstance?: monaco.editor.IStandaloneCodeEditor;
    monacoModel?: monaco.editor.ITextModel;
    constrainedInstance?: ReturnType<typeof constrainedEditor>;
    code: string;
    language: string;
    /** Restrict editing to the slot ranges when the problem uses slots. */
    useSlots?: boolean;
    /** The slot ranges to restrict editing to. */
    slots?: Slot[];
    /** Per-slot code sections, kept in sync with the editor content. */
    codeSections?: Record<string, string>;
    /** Make the editor read-only. */
    locked?: boolean;
    /** The code to restore when the registered reset callback is invoked. */
    resetCode?: string;
    /** The slot ranges to re-apply after a reset. */
    resetSlots?: Slot[];
    /** The per-slot code sections to restore after a reset. */
    resetSections?: Record<string, string>;
    /** Invoked with a callback that restores the editor to its reset state. */
    registerReset?: (_cb: () => void) => void;
    class?: string;
  } = $props();

  let editorContainer = $state<HTMLDivElement>();

  function clampRange(
    model: monaco.editor.ITextModel,
    [startLine, startColumn, endLine, endColumn]: [number, number, number, number]
  ): [number, number, number, number] {
    const lineCount = model.getLineCount();
    const start = Math.min(Math.max(startLine, 1), lineCount);
    const end = Math.min(Math.max(endLine, start), lineCount);
    return [
      start,
      Math.min(Math.max(startColumn, 1), model.getLineMaxColumn(start)),
      end,
      Math.min(Math.max(endColumn, 1), model.getLineMaxColumn(end))
    ];
  }

  function registerConstrained(ranges: { range: [number, number, number, number]; label: string }[]) {
    if (useSlots && monacoInstance && constrainedInstance && monacoModel) {
      constrainedInstance.initializeIn(monacoInstance);
      const model = monacoInstance.getModel();
      if (!model) return;
      try {
        constrainedInstance.addRestrictionsTo(
          model,
          ranges.map((entry) => ({ ...entry, range: clampRange(model, entry.range), allowMultiline: true }))
        );
      } catch (error) {
        console.error('Could not restrict the editor to its slot ranges', error);
        return;
      }

      // @ts-expect-error Added by non-TypeScript plugin
      monacoModel.toggleHighlightOfEditableAreas({
        cssClassForSingleLine: 'customClass--singleLine',
        cssClassForMultiLine: 'customClass--multiLine'
      });

      // @ts-expect-error Added by non-TypeScript plugin
      monacoModel.onDidChangeContentInEditableRange((newCode) => {
        codeSections = { ...$state.snapshot(codeSections), ...newCode };
      });
    }
  }

  async function handleReset() {
    if (!monacoNamespace || resetCode === undefined) return;
    const monaco = await monacoNamespace;
    if (!monaco) return;
    const newModel = monaco.editor.createModel(resetCode, language);
    monacoInstance?.setModel(newModel);
    monacoModel?.dispose();
    monacoModel = newModel;
    registerConstrained(resetSlots.map((slot) => ({ label: slot.label, range: slot.initialRange })));
    codeSections = { ...resetSections };
  }

  onMount(() => {
    if (!browser) return;

    if (registerReset) {
      registerReset(handleReset);
    }

    monacoNamespace = import('$lib/monaco').then((module) => {
      if (!editorContainer) return;
      const { monaco } = module;
      const constrained = constrainedEditor(monaco);
      constrainedInstance = constrained;

      monacoInstance = monaco.editor.create(editorContainer, {
        ...BASE_MONACO_OPTIONS,
        ...toMonacoEditorOptions(editorSettings.current),
        value: code,
        language
      });

      monacoModel = monacoInstance.getModel() || undefined;

      monacoInstance.onDidChangeModelContent(() => {
        code = monacoInstance?.getValue() || '';
      });

      registerConstrained(slots.map((slot) => ({ label: slot.label, range: slot.initialRange })));

      return monaco;
    });
    return () => {
      monacoInstance?.dispose();
      monacoModel?.dispose();
    };
  });

  $effect(() => {
    monacoInstance?.updateOptions({ readOnly: locked });
  });

  // User settings, kept separate from the `readOnly` effect above so a
  // preference can never fight the run lock.
  $effect(() => {
    monacoInstance?.updateOptions(toMonacoEditorOptions(editorSettings.current));
  });

  // Model options (tab size, spaces) do not live on the editor, and `handleReset`
  // swaps in a brand-new model — reading `monacoModel` here re-applies them on
  // that swap, so Reset Code doesn't silently revert the user's indentation.
  $effect(() => {
    monacoModel?.updateOptions(toMonacoModelOptions(editorSettings.current));
  });

  $effect(() => {
    if (!useSlots) {
      codeSections['body'] = code;
    }
  });

  $effect(() => {
    if (monacoInstance && code !== monacoInstance.getValue()) {
      const model = monacoInstance.getModel() as monaco.editor.IModel;
      if (!model) return;
      const fullRange = model.getFullModelRange();
      monacoInstance.pushUndoStop();
      monacoInstance.executeEdits('undoable-reset', [
        {
          range: fullRange,
          text: code
        }
      ]);

      monacoInstance.pushUndoStop();
    }
  });
</script>

<div
  class="{rest.class} w-full h-full"
  bind:this={editorContainer}
>
  {#if !monacoInstance}
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
