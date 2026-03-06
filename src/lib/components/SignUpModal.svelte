<script lang="ts">
	import { openLogin } from '$lib/state/login.svelte';
	import { signIn } from '@auth/sveltekit/client';

	const closeModal = () => {
		openLogin.openSignUp = false;
	};

	let termsAccepted = $state(false);
	let cookiePolicyAccepted = $state(false);
	let enableSignUp = $derived.by(() => {
		return termsAccepted && cookiePolicyAccepted;
	});
</script>

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
		<h1 class="text-3xl font-bold mt-2">Sign Up</h1>
		<div class="card-body w-full">
			<div class="h-56 overflow-y-auto border border-gray-700 rounded-lg p-4 mb-4 text-sm">
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
			<div class="space-y-4">
				<label class="flex items-center space-x-2">
					<input
						type="checkbox"
						class="checkbox checkbox-success"
						required
						bind:checked={termsAccepted}
					/>
					<span class="text-sm">I have read and agree to the Terms and Conditions</span>
				</label>
				<label class="flex items-center space-x-2">
					<input
						type="checkbox"
						class="checkbox checkbox-success"
						required
						bind:checked={cookiePolicyAccepted}
					/>
					<span class="text-sm">I agree to the Cookie Policy</span>
				</label>

				{#if enableSignUp}
					<button
						type="button"
						class="bg-[#1E1E1E] btn w-full gap-2 border-[#0A875E] text-[#0A875E] hover:bg-[#006239] hover:text-white transition-all duration-300"
						onclick={() => {
							signIn('google');
						}}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 488 512"
							class="w-5 h-5 fill-current"
						>
							<path
								d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
							/>
						</svg>
						Continue with Google
					</button>
				{:else}
					<button disabled={true} class="btn btn-disabled w-full gap-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 488 512"
							class="w-5 h-5 fill-current"
						>
							<path
								d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
							/>
						</svg>
						Continue with Google
					</button>
				{/if}
			</div>
			<p class="text-center text-xs text-gray-400">
				Already have an account?
				<button
					class="text-[#0A875E] hover:text-[#006239]"
					onclick={() => {
						openLogin.openSignUp = false;
						openLogin.open = true;
					}}>Sign in</button
				>
			</p>
		</div>
	</div>
	<button
		onclick={() => {
			openLogin.openSignUp = false;
		}}
		class="bg-black/50 absolute w-full h-full z-9"
		aria-label="Hidden Close"
	></button>
</div>
