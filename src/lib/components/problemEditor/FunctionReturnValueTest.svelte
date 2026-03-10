<script lang="ts">
	import type { FunctionOutputTestCase, ProblemTestCase } from '../../../../zenstack/models';
	import CParameterSelector from './CParameterSelector.svelte';

	let { testCase = $bindable() }: { testCase: FunctionOutputTestCase } = $props();
</script>

{#if testCase.type == 'FunctionOutputTestCase'}
	<div class="flex flex-col gap-2">
		<input
			type="text"
			class="focus:bg-transparent input input-sm input-ghost input-bordered w-full"
			placeholder="Function Name (Case-sensitive)"
			bind:value={testCase.function_name}
		/>
		Return Value:
		<div class="flex flex-row gap-2">
			<CParameterSelector bind:type={testCase.expected_output} />
			<input
				type="text"
				class="focus:bg-transparent input input-sm input-ghost input-bordered w-full"
				placeholder="Return Value (C literal)"
				bind:value={testCase.expected_output.value}
			/>
		</div>
		Input Parameters:
		{#each testCase.parameters as parameter, i}
			<div class="flex flex-row gap-2">
				<CParameterSelector bind:type={testCase.parameters[i]} />
				<input
					type="text"
					class="focus:bg-transparent input input-sm input-ghost input-bordered w-full"
					placeholder="Input (C literal)"
					bind:value={testCase.parameters[i].value}
				/>
			</div>
		{/each}
		<button
			class="btn btn-success w-full btn-sm"
			onclick={() => testCase.parameters.push({ base: 'INT', value: '' })}>Add Parameter</button
		>
	</div>
{/if}
