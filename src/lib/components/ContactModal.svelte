<script lang="ts">
	/** @type {{openLogin: any}} */
	import { openTerms } from '$lib/state/terms.svelte';

	const closeModal = () => {
		openTerms.contact = false;
	};
</script>

{#if openTerms.contact}
	<div class="fixed grid place-items-center w-full h-full z-20">
		<div
			class="bg-[#1E1E1E] shadow-xl flex flex-col justify-center items-center z-10 rounded-md relative w-96 md:w-[450px] pt-10 pb-5"
		>
			<button
				class="btn btn-square btn-ghost absolute top-2 right-2"
				onclick={closeModal}
				aria-label="Close"
			>
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
			<div class="card-body mt3 w-full max-h-[60vh] overflow-y-auto px-4">
				<h2 class="text-2xl font-bold mb-6 text-center">Contact Us</h2>
				<div class="space-y-4 p-5">
					<div class="flex items-center space-x-3">
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
								d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
							/>
						</svg>
						<a href="mailto:your.email@example.com" class="text-blue-400 hover:text-blue-300"
							>paul_enclonar@edlsu.edu.ph</a
						>
					</div>
					<div class="flex items-center space-x-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
							/>
						</svg>
						<a
							href="https://www.facebook.com/boris.victoria.2024"
							target="_blank"
							rel="noopener noreferrer"
							class="text-blue-400 hover:text-blue-300">Facebook Page</a
						>
					</div>
				</div>
			</div>
		</div>
		<button
			onclick={closeModal}
			class="bg-black/50 absolute w-full h-full z-9"
			aria-label="Hidden Close"
		></button>
	</div>
{/if}
