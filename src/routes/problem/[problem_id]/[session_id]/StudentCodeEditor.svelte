<script lang="ts">
  import CodeEditor from '$lib/components/editor/CodeEditor.svelte';
  import type { monaco } from '$lib/monaco';
  import type { ClientPracticeSession } from '$lib/practiceSession/clientPracticeSession';
  import type { Problem } from '$lib/problem';
  import { ClientRegistryProvider } from '$lib/registry/client';
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
    testSubmitted = false,
    registerReset
  }: {
    language: string;
    useSlots: boolean;
    codeSections: Record<string, string>;
    practiceSession: ClientPracticeSession;
    problem: Problem;
    locked: boolean;
    testSubmitted?: boolean;
    registerReset?: (_cb: () => void) => void;
  } = $props();

  let monacoNamespace: Promise<typeof monaco | undefined> | undefined = $state();
  let monacoInstance: monaco.editor.IStandaloneCodeEditor | undefined = $state();
  let monacoModel: monaco.editor.ITextModel | undefined = $state();
  let constrainedInstance: ReturnType<typeof constrainedEditor> | undefined = $state();

  let telemetry = $state<TelemetryService | null>(null);
  $effect(() => {
    if (telemetry) return;
    void ClientRegistryProvider.instance()
      .getService(TelemetryService)
      .then((t) => {
        telemetry = t;
      });
  });

  // svelte-ignore state_referenced_locally
  let code = $state(practiceSession.previousCode.fullCode);

  onMount(() => {
    monacoNamespace?.then(() => {
      if (!monacoInstance) return;
      telemetry?.attachMonaco(monacoInstance);
    });
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
    {useSlots}
    bind:codeSections
    slots={problem.getSlots()}
    bind:locked
    resetCode={problem.getProcessedCode()}
    resetSlots={problem.getSlots()}
    resetSections={Object.fromEntries(
      problem.getDefaultSections().map((section) => [section.slot.label, section.code])
    )}
    {registerReset}
  />

  {#if locked && !testSubmitted}
    <div class="absolute inset-0 bg-base-200 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
      <Spinner class="w-10 h-10 text-base-content animate-spin" />
    </div>
  {/if}
</div>
