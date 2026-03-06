<script lang="ts">
	/** @type {{show?: boolean, closeModal: any, children?: import('svelte').Snippet}} */
	let { show = false, closeModal, children } = $props();
</script>

<!-- Modal Background -->
<div class="fixed top-0 left-0 grid place-items-center w-full h-full" class:hidden={!show}>
	<div
		class="card shadow-xl w-96 flex flex-col justify-center items-center z-10 bg-[#1E1E1E] relative"
	>
		<div class="flex justify-end w-full p-1">
			<button class="btn btn-square btn-ghost" onclick={closeModal} aria-label="Close">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
		<div class="px-8 mb-5 w-full mt-2">
			{@render children?.()}
		</div>
	</div>
	<button onclick={closeModal} class="bg-black/50 absolute w-full h-full z-2" aria-label="Close"
	></button>
</div>
