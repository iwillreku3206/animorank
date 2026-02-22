<script>
	import Modal from './Modal.svelte';
	import done from '$lib/assets/done.svg';

	/** @type {{closeModal: any, show?: boolean, email: string, name: string, pictureURL: string}} */
	let { closeModal, show = false, email, name, pictureURL } = $props();
	let AccessibleWithLink = $state(false);
	let Private = $state(false);
</script>

<Modal {show} {closeModal}>
	<form method="POST" action="?/createPset">
		<input type="hidden" name="owner_email" value={email} />
		<input
			type="text"
			placeholder="Problem Set Name"
			name="title"
			class="input input-bordered w-full max-w-xs bg-inherit"
			required
		/>
		<textarea
			class="textarea textarea-bordered bg-inherit w-full mt-5"
			name="description"
			placeholder="Description"
		></textarea>
		<div class="form-control">
			<label class="label cursor-pointer">
				<span class="label-text">Private (alpha)</span>
				
				<input
					type="checkbox"
					class="checkbox"
					bind:checked={Private}
					name="is_private"
				/>
			</label>
			{#if Private}
			<label class="label cursor-pointer">
				<span class="label-text">Auto Accept Students</span>
				<input
					type="checkbox"
					class="checkbox"
					bind:checked={AccessibleWithLink}
					name="auto_accept"
				/>
			</label>
			{:else}
				<input
					type="hidden"
					value={false}
					name="auto_accept"
				/>
			{/if}
		</div>
		<div class="flex justify-end mt-5">
			<button class="btn btn-s bg-[#006239] border-0 hover:bg-[#004327]" type="submit">
				<img src={done} alt="edit" class="h-6 cursor-pointer" />
			</button>
		</div>
	</form>
</Modal>
