<script lang="ts">
	import deleteIcon from '$lib/assets/delete.svg';
	import type { ProblemTestCase } from '../../../../generated/prisma/client';
	import FunctionReturnValueTest from './FunctionReturnValueTest.svelte';

	let {
		testCase = $bindable(),
		onDelete,
		deleteDisabled
	}: { testCase: ProblemTestCase; onDelete?: () => void; deleteDisabled: boolean } = $props();
</script>

<div class="w-full bg-[#212121] rounded-lg p-4">
	<div class="flex flex-col">
		<div class="flex flex-row gap-2 items-center">
			Test Type:
			<select
				name="Test Case Type"
				bind:value={testCase.type}
				class="select select-bordered select-sm bg-transparent"
			>
				<option value="FUNCTION_OUTPUT" selected>Function Return Value</option>
				<option value="PROGRAM_IO">Program I/O</option>
				<option value="CUSTOM">Custom Function</option>
			</select>
			<div class="ml-auto">
				<button title="Delete Test Case" onclick={onDelete} disabled={deleteDisabled}>
					<img
						src={deleteIcon}
						alt="Delete Icon"
						class={`${!deleteDisabled ? 'red-svg' : 'disabled-svg'} h-6 w-6`}
					/>
				</button>
			</div>
		</div>
		{#if testCase.type == 'FUNCTION_OUTPUT'}
			<FunctionReturnValueTest bind:testCase />
		{/if}
	</div>
</div>

<style>
	.red-svg {
		filter: brightness(0) saturate(100%) invert(17%) sepia(80%) saturate(5957%) hue-rotate(6deg)
			brightness(107%) contrast(134%);
	}

	.disabled-svg {
		filter: brightness(0) saturate(100%) invert(25%) sepia(7%) saturate(0%) hue-rotate(158deg)
			brightness(92%) contrast(87%);
	}
</style>
