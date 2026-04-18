<script lang="ts">
	import { enhance } from '$app/forms';
	import { error } from '@sveltejs/kit';
	const { form } = $props();

	let showModal = $state(false);
	let isConfirmed = $state(false);
</script>

<div class="max-w-2xl mx-auto p-6">
	<h1 class="text-3xl font-bold mb-6">Terms of Service</h1>

	<div class="prose dark:prose-invert mb-8 p-4 border rounded">
		<p>Welcome to Animorank. By using our services, you agree to the following terms...</p>
		<p>[Insert full Terms of Service text here]</p>
		<p>
			Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
			labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
			laboris nisi ut aliquip ex ea commodo consequat.
		</p>
	</div>

	<form method="POST" action="?/accept" use:enhance class="flex gap-4">
		<button
			name="accept"
			type="submit"
			class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
		>
			Accept
		</button>
		<button
			type="button"
			onclick={() => (showModal = true)}
			class="bg-gray-300 text-black px-6 py-2 rounded hover:bg-gray-400 transition"
		>
			Decline
		</button>
	</form>

	{#if showModal}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-sm w-full mx-4 shadow-xl">
				<h2 class="text-xl font-bold mb-4">Confirm Account Deletion</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-4">
					You have declined the Terms of Service. If you do not accept them, you will not be able to
					use Animorank. Are you sure you want to delete your account? This action cannot be undone.
				</p>

				<label class="flex items-start gap-3 mb-6 cursor-pointer group">
					<input
						type="checkbox"
						bind:checked={isConfirmed}
						class="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<span
						class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors"
					>
						Yes. I confirm I want to delete my account.
					</span>
				</label>

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={() => {
							showModal = false;
							isConfirmed = false;
						}}
						class="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
					>
						Cancel
					</button>
					<form method="POST" action="?/deleteAccount" use:enhance>
						<button
							type="submit"
							disabled={!isConfirmed}
							class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
						>
							Delete Account
						</button>
					</form>
				</div>
			</div>
		</div>
	{/if}
</div>
