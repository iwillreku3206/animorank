<script lang="ts">
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import type { CustomRunResponse } from './api';

  interface Props {
    loading: boolean;
    result: CustomRunResponse | null;
    onRun: (_stdin: string) => void;
  }

  let { loading = false, result = null, onRun }: Props = $props();

  let stdin = $state('');
</script>

<div class="flex flex-col h-full p-4 gap-4">
  <div class="flex flex-col gap-2 flex-1">
    <label
      class="text-sm font-medium text-base-content/80"
      for="custom-stdin"
    >
      Standard Input (stdin)
    </label>
    <textarea
      id="custom-stdin"
      bind:value={stdin}
      class="textarea textarea-bordered w-full flex-1 font-mono text-sm resize-none"
      placeholder="Enter input to pass to your program..."
      rows="6"
    ></textarea>
  </div>

  <Button
    class="btn-sm btn-primary"
    onclick={() => onRun(stdin)}
    disabled={loading}
  >
    {loading ? 'Running...' : 'Run Code'}
  </Button>

  {#if result !== null}
    <div class="flex flex-col gap-3">
      {#if result.success}
        <div class="flex flex-col gap-2">
          <h3 class="text-sm font-medium text-success">Output (stdout)</h3>
          <pre
            class="bg-base-200 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap break-words">{result.stdout ||
              '(no output)'}</pre>
        </div>
        {#if result.stderr}
          <div class="flex flex-col gap-2">
            <h3 class="text-sm font-medium text-warning">Standard Error (stderr)</h3>
            <pre
              class="bg-base-200 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap break-words text-warning">{result.stderr}</pre>
          </div>
        {/if}
      {:else if result.error}
        <div class="flex flex-col gap-2">
          <h3 class="text-sm font-medium text-error">Compile Error</h3>
          <pre
            class="bg-base-200 p-3 rounded-lg font-mono text-xs whitespace-pre-wrap break-words text-error">{result.error}</pre>
        </div>
      {:else}
        <div class="flex flex-col gap-2">
          <h3 class="text-sm font-medium text-error">Runtime Error</h3>
          {#if result.stderr}
            <pre
              class="bg-base-200 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap break-words text-error">{result.stderr}</pre>
          {/if}
          {#if result.stdout}
            <div class="flex flex-col gap-2">
              <h3 class="text-sm font-medium text-base-content/80">Output before error (stdout)</h3>
              <pre
                class="bg-base-200 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap break-words">{result.stdout}</pre>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
