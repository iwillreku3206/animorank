<script>
	let { toggleConsole = $bindable(), consoleContent = [], unreadConsole = $bindable() } = $props();
</script>

{#if toggleConsole}
	<span class="w-full h-56 overflow-y-auto">
		<div class="h-4 bg-black/30 flex flex-row items-center justify-center p-2">
			<button
				class="text-xs cursor-pointer"
				onclick={() => {
					toggleConsole = !toggleConsole;
				}}>Close Console</button
			>
		</div>
		{#each consoleContent as line}
			<div class="px-2 pt-1">
				<p class="text-xs">{line}</p>
			</div>
		{/each}
	</span>
{:else}
	<span class="w-full shrink-0">
		<div class=" bg-black/30 flex flex-row items-center justify-center">
			<button
				class="text-xs cursor-pointer relative"
				onclick={() => {
					toggleConsole = !toggleConsole;
					unreadConsole = false;
				}}
			>
				Open Console {unreadConsole ? '🚨' : ''}
			</button>
		</div>
	</span>
{/if}
