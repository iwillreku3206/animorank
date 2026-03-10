<script lang="ts">
	import type { ProblemTestCase, ProgramIOTestCase } from '../../../../zenstack/models';
	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import CParameterSelector from './CParameterSelector.svelte';

	let { testCase = $bindable() }: { testCase: ProgramIOTestCase } = $props();
</script>

{#if testCase.type == 'ProgramIOTestCase'}
	<div class="flex flex-col gap-2">
		<label for="testcase__{testCase.id}__input">Input:</label>
		<textarea
			id="testcase__{testCase.id}__input"
			class="focus:bg-transparent textarea font-mono textarea-bordered textarea-ghost"
			bind:value={testCase.input}
		></textarea>

		<label for="testcase__{testCase.id}__output">Expected Output:</label>
		<textarea
			id="testcase__{testCase.id}__output"
			class="focus:bg-transparent textarea font-mono textarea-bordered textarea-ghost"
			bind:value={testCase.output}
		></textarea>
	</div>
{/if}
