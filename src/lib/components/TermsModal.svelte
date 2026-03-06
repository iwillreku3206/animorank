<script lang="ts">
	import { openTerms } from '$lib/state/terms.svelte';

	const closeModal = () => {
		openTerms.open = false;
	};
</script>

{#if openTerms.open}
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
				<h3 class="font-bold mb-2">Terms and Conditions</h3>
				<div class="text-gray-400">
					<p class="mb-3">
						By using AnimoRank, you agree to these terms. We provide this platform as is, and make
						no warranties about the service's completeness or availability.
					</p>
					<p class="mb-3">
						You are responsible for maintaining the confidentiality of your account and for all
						activities that occur under your account. You must immediately notify AnimoRank of any
						unauthorized use.
					</p>
					<p class="mb-3">
						AnimoRank reserves the right to modify or terminate the service for any reason, without
						notice, at any time. We reserve the right to alter these Terms at any time.
					</p>
					<p class="mb-5">
						All content provided is for informational purposes only. AnimoRank makes no
						representations as to accuracy, completeness, suitability, or validity of any
						information on the site.
					</p>
				</div>
				<h3 class="font-bold mb-2">Cookie Policy</h3>
				<div class="text-gray-400">
					<p class="mb-4">We use cookies for several purposes, including</p>
					<ul class="list-disc pl-5 mb-4">
						<li class="mb-3">
							Analytical cookies: Allow us to recognize and count users, and see how they move
							around our website.
						</li>
						<li>
							Essential cookies: Required for the operation of our website like for storing problem
							history
						</li>
					</ul>
					<p class="mb-4">
						As of right now, this web app relies on cookies to function properly. Therefore, we
						require your agreement to our Cookie Policy before you can continue.
					</p>
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
