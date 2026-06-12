<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageProps } from './$types';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import ButtonLink from '$lib/components/ui/buttons/ButtonLink.svelte';
  import TextInput from '$lib/components/ui/inputs/TextInput.svelte';
  import ClickableBadge from '$lib/components/ui/badges/ClickableBadge.svelte';
  import { ProblemSetEditorWindowContext } from './context.svelte';
  import { ProblemSetEditorWindowRegistry } from './windowRegistry';

  let { data }: PageProps = $props();

  const windowRegistry = new ProblemSetEditorWindowRegistry();
  let windowMap: Record<string, Window<ProblemSetEditorWindowContext>> = $state({});
  let windowIds: keyof typeof windowMap = $derived(Object.keys(windowMap));

  let context = $state(new ProblemSetEditorWindowContext({}));
</script>
