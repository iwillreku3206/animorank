<script lang="ts">
	import ProblemEditor from '$lib/components/problemEditor/ProblemEditor.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let problem = $state(data.problem);
	let testCases = $state(data.testCases);
</script>

<ProblemEditor bind:problem bind:testCases />
