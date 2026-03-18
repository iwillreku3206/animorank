<script lang="ts">
	import type { TestCaseResult } from '$lib/types/codeExecution';
	import { type ProgramIOTestCase } from '../../../zenstack/models';

	interface Props {
		tests: TestCaseResult[];
	}

	let { tests }: Props = $props();
</script>

{#each tests as test}
	<div class="border-b border-gray-700 p-3">
		<div class="flex items-center justify-between mb-2">
			<span class="text-sm font-medium">STDIO Test</span>
			<span class="text-xs {test.success ? 'text-green-400' : 'text-red-400'}"
				>{test.success ? 'Passed' : 'Failed'}</span
			>
		</div>
		{#if test.run_info}
			<div class="text-xs text-gray-400 mb-1">
				<span class="text-gray-500">Input:</span>
				{(test.test_info as ProgramIOTestCase | undefined)?.input}
			</div>
			<div class="text-xs text-gray-400 mb-1">
				<span class="text-gray-500">Expected Output:</span>
				<pre>{test.run_info.expected}</pre>
			</div>
			<div class="text-xs {test.success ? 'text-green-300' : 'text-red-300'} mb-1">
				<span class="text-gray-500">Actual Output:</span>
				{test.run_info.actual}
			</div>
		{/if}
		{#if !test.success && test.error_reason?.type === 'runtime_error'}
			<div class="text-xs text-red-300">Runtime Error</div>
		{/if}
		{#if !test.success && test.error_reason?.type === 'compile_error'}
			<div class="text-xs text-red-300">
				Compile Error: <pre>{test.error_reason.error}</pre>
			</div>
		{/if}
	</div>
{/each}
