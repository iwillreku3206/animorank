<script lang="ts">
	import type { TestCaseResult } from '$lib/types/codeExecution';

	interface Props {
		tests: TestCaseResult[];
	}

	let { tests }: Props = $props();
</script>

{#each tests as test}
	<div class="border-b border-gray-700 p-3">
		<div class="flex items-center justify-between mb-2">
			<span class="text-sm font-medium">Custom Test</span>
			<span class="text-xs {test.success ? 'text-green-400' : 'text-red-400'}"
				>{test.success ? 'Passed' : 'Failed'}</span
			>
		</div>
		<div class="text-xs text-gray-500">Custom test case</div>
		{#if !test.success}
			{#if test.error_reason?.type === 'runtime_error'}
				<div class="text-xs text-red-300">Runtime Error</div>
			{/if}
			{#if test.error_reason?.type === 'compile_error'}
				<div class="text-xs text-red-300">Compile Error: {test.error_reason.error}</div>
			{/if}
		{/if}
	</div>
{/each}
