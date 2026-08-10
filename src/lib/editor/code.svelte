<script lang="ts">
  import type { CodeEditorOptions, CodeEditorState } from './code';

  let {
    state = $bindable(),
    options
  }: {
    state: CodeEditorState;
    options: CodeEditorOptions;
  } = $props();
</script>
