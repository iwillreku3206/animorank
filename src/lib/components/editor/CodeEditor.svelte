<script lang="ts">
  import { onMount } from 'svelte';
  import { type monaco } from '$lib/monaco';
  import { browser } from '$app/environment';
  import constrainedEditor from 'constrained-editor-plugin';
  import { DEFAULT_MONACO_THEME } from './themes';

  let {
    // eslint-disable-next-line no-useless-assignment
    monacoNamespace = $bindable(undefined),
    monacoInstance = $bindable(undefined),
    monacoModel = $bindable(undefined),
    // eslint-disable-next-line no-useless-assignment
    constrainedInstance = $bindable(undefined),
    code = $bindable(''),
    language,
    ...rest
  }: {
    monacoNamespace?: Promise<typeof monaco | undefined>;
    monacoInstance?: monaco.editor.IStandaloneCodeEditor;
    monacoModel?: monaco.editor.ITextModel;
    constrainedInstance?: ReturnType<typeof constrainedEditor>;
    code: string;
    language: string;
    class?: string;
  } = $props();

  let editorContainer = $state<HTMLDivElement>();

  onMount(() => {
    if (!browser) return;

    monacoNamespace = import('$lib/monaco').then((module) => {
      if (!editorContainer) return;
      const { monaco } = module;
      const constrained = constrainedEditor(monaco);
      constrainedInstance = constrained;

      monacoInstance = monaco.editor.create(editorContainer, {
        bracketPairColorization: {
          enabled: true
        },
        value: code,
        automaticLayout: true,
        fontFamily: 'JetBrains Mono',
        language,
        minimap: {
          enabled: false
        },
        theme: DEFAULT_MONACO_THEME,
        wordWrap: 'on',
        wordBasedSuggestions: 'currentDocument'
      });

      monacoModel = monacoInstance.getModel() || undefined;

      monacoInstance.onDidChangeModelContent(() => {
        code = monacoInstance?.getValue() || '';
      });

      return monaco;
    });
    return () => {
      monacoInstance?.dispose();
      monacoModel?.dispose();
    };
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
