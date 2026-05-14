<script lang="ts">
  import CodeEditor from '$lib/components/CodeEditor.svelte';
  import type { monaco } from '$lib/monaco';
  import type { ClientPracticeSession } from '$lib/practiceSession/clientPracticeSession';
  import type { Problem } from '$lib/problem';
  import { ClientServiceProvider } from '$lib/services/clientServiceProvider';
  import { TelemetryService } from '$lib/telemetry/telemetryService';
  import constrainedEditor from 'constrained-editor-plugin';
  import { onMount } from 'svelte';
  import Spinner from '@iconify-svelte/fa6-solid/spinner';

  let {
    language,
    useSlots,
    codeSections = $bindable(),
    practiceSession,
    problem,
    locked = $bindable(),
    registerReset
  }: {
    language: string;
    useSlots: boolean;
    codeSections: Record<string, string>;
    practiceSession: ClientPracticeSession;
    problem: Problem;
    locked: boolean;
    registerReset?: (_cb: () => void) => void;
  } = $props();

  let monacoNamespace: Promise<typeof monaco | undefined> | undefined = $state();
  let monacoInstance: monaco.editor.IStandaloneCodeEditor | undefined = $state();
  let monacoModel: monaco.editor.ITextModel | undefined = $state();
  let constrainedInstance: ReturnType<typeof constrainedEditor> | undefined = $state();

  const telemetry = ClientServiceProvider.instance().getService(TelemetryService);

  // svelte-ignore state_referenced_locally
  let code = $state(practiceSession.previousCode.fullCode);

  $effect(() => {
    if (!useSlots) {
      codeSections['body'] = code;
    }
  });

  async function handleReset() {
    if (!monacoNamespace) return;
    const monaco = await monacoNamespace;
    if (!monaco) return;
    const starterCode = problem.getProcessedCode();
    const newModel = monaco.editor.createModel(starterCode, language);
    monacoInstance?.setModel(newModel);
    monacoModel?.dispose();
    monacoModel = newModel;
    registerConstrained(
      problem.getSlots().map((slot) => ({ label: slot.label, range: slot.initialRange }))
    );
    codeSections = Object.fromEntries(
      problem.getDefaultSections().map((s) => [s.slot.label, s.code])
    );
  }

  function registerConstrained(
    ranges: { range: [number, number, number, number]; label: string }[]
  ) {
    if (useSlots && monacoInstance && constrainedInstance && monacoModel) {
      constrainedInstance.initializeIn(monacoInstance);
      const model = monacoInstance.getModel();
      if (!model) return;
      constrainedInstance.addRestrictionsTo(
        model,
        ranges.map((range) => ({ ...range, allowMultiline: true }))
      );

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

  onMount(() => {
    if (registerReset) {
      registerReset(handleReset);
    }

    monacoNamespace?.then(() => {
      if (!monacoInstance) return;

      telemetry.attachMonaco(monacoInstance);

      registerConstrained(
        practiceSession.previousCode.sections.map((section) => ({
          range: section.slot.initialRange,
          label: section.slot.label
        }))
      );
    });
  });

  $effect(() => {
    monacoInstance?.updateOptions({ readOnly: locked });
  });
</script>

<div class="relative w-full h-full">
  <CodeEditor
    bind:code
    bind:monacoNamespace
    bind:monacoInstance
    bind:monacoModel
    bind:constrainedInstance
    {language}
  />

  {#if locked}
    <div
      class="absolute inset-0 bg-base-200 backdrop-blur-[1px] flex items-center justify-center rounded-lg"
    >
      <Spinner class="w-10 h-10 text-base-content animate-spin" />
    </div>
  {/if}
</div>
