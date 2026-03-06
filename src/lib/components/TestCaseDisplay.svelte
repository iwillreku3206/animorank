<script lang="ts">
	let { toggleTestResults = $bindable(false), test_passed = [], test_failed = [] } = $props();
</script>

{#if toggleTestResults}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-[#121212] p-6 rounded-lg shadow-lg max-w-md w-full">
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-xl font-semibold">Test Cases</h3>
				<button
					class="btn btn-circle btn-sm btn-ghost"
					onclick={() => (toggleTestResults = !toggleTestResults)}>✕</button
				>
			</div>
			<div class="space-y-4">
				{#if test_failed.length > 0}
					<div>
						<h4 class="mb-2">Failed Tests</h4>
						<div class="bg-black/30 p-2 rounded-lg">
							{#each test_failed as test}
								<div class="text-sm mb-1">• {test}</div>
							{/each}
						</div>
					</div>
				{/if}
				{#if test_passed.length > 0}
					<div>
						<h4 class="mb-2">Passed Tests</h4>
						<div class="bg-black/30 p-2 rounded-lg">
							{#each test_passed as test}
								<div class="text-sm mb-1">• {test}</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
