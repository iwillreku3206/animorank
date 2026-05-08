<script lang="ts">
  import { onMount } from 'svelte';
  import { type monaco } from '$lib/monaco';
  import { browser } from '$app/environment';
  import { ClientServiceProvider } from '$lib/services/clientServiceProvider';
  import { TelemetryService } from '$lib/telemetry/telemetryService';

  // export const setValue = () => {
  // 	value = editor.getValue();
  // };

  let {
    code = $bindable(),
    locked = $bindable(false),
    language,
    ...rest
  }: { code: string; locked?: boolean; language?: string; class?: string } = $props();

  let monacoInstance: monaco.editor.IStandaloneCodeEditor | undefined = $state();
  let editorContainer = $state<HTMLDivElement>();

  onMount(() => {
    if (!browser) return;

    import('$lib/monaco').then((module) => {
      if (!editorContainer) return;
      const { monaco } = module;

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
        theme: 'vs-dark',
        wordWrap: 'on',
        wordBasedSuggestions: 'currentDocument'
      });

      monacoInstance.setModel(monaco.editor.createModel(code, 'c'));

      monacoInstance.onDidChangeModelContent(() => {
        code = monacoInstance?.getValue() || '';
      });

      const telemetry = ClientServiceProvider.instance().getService(TelemetryService);
      telemetry.attachMonaco(monacoInstance);

      return () => monacoInstance?.dispose();
    });
  });

  $effect(() => {
    if (monacoInstance && code !== monacoInstance.getValue()) {
      const model = monacoInstance.getModel() as monaco.editor.IModel;

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

  $effect(() => {
    monacoInstance?.updateOptions({ readOnly: locked });
  });
</script>

<div
  class="{rest.class} w-full h-full {locked ? 'opacity-90' : ''}"
  bind:this={editorContainer}
>
  {#if !monacoInstance}
    <p class="content-center w-full h-full text-grey-400">Loading Editor...</p>
  {/if}
</div>
