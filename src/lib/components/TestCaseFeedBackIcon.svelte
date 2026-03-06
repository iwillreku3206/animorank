<script lang="ts">
	let {
		toggleTestResults = $bindable(),
		test_failed_count = 0,
		test_passed_count = 0,
		isPassed = -1
	} = $props();
</script>

{#if isPassed == 1}
	<div
		class="grid place-items-center tooltip tooltip-bottom cursor-pointer"
		data-tip="Test Cases Failed"
	>
		<button
			class="w-9 h-9 border-2 rounded-full grid place-items-center p-1 border-red-500 text-red-500"
			onclick={() => (toggleTestResults = !toggleTestResults)}
		>
			{test_failed_count}
		</button>
	</div>
{:else if isPassed == 0}
	<div
		class="grid place-items-center tooltip tooltip-bottom cursor-pointer"
		data-tip="Test Cases Passed"
	>
		<button
			class="w-9 h-9 border-2 rounded-full grid place-items-center p-1 border-green-500 text-green-500"
			onclick={() => (toggleTestResults = !toggleTestResults)}
		>
			{test_passed_count}
		</button>
	</div>
{/if}
