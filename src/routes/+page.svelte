<script lang="ts">
	import StudentPSBox from '$lib/components/StudentPSBox.svelte';
	import TeacherPSBox from '$lib/components/TeacherPSBox.svelte';
	import CreateNewSet from '$lib/components/CreateNewSet.svelte';

	let showCreatePSetModal = $state(false);
	let { data } = $props();
</script>

{#if data.user?.role === 'teacher'}
	<div class="w-screen bg-[#121212]">
		<div class="mt-12 px-3 flex justify-between">
			<h2 class="font-arial text-2xl">Dashboard</h2>
			<button
				class="btn btn-s bg-[#006239] text-white hover:bg-[#004327] mt-1"
				onclick={() => (showCreatePSetModal = true)}
			>
				Create new set
			</button>
		</div>
		<div class="flex flex-row flex-wrap justify-start w-8.5/10 mx-auto">
			{#if data.psets}
				{#each data.psets as pset}
					<TeacherPSBox {pset} />
				{/each}
			{/if}
		</div>
		<CreateNewSet
			closeModal={() => (showCreatePSetModal = false)}
			show={showCreatePSetModal}
			email={data.user.email}
			name={data.user.name}
			pictureURL={data.user.picture}
		/>
	</div>
{:else if data.user?.role === 'student'}
	<div class="w-screen bg-[#121212]">
		<div class="mt-12 px-3 flex justify-between">
			<h2 class="font-arial text-2xl">Problems</h2>
		</div>
		<div class="flex flex-row flex-wrap justify-start w-8.5/10 mx-auto">
			{#if data.psets}
				{#each data.psets as pset}
					{#if pset.Problem.length > 0}
						<StudentPSBox title={pset.title} {pset} Problems={pset.Problem} />
					{/if}
				{/each}
			{/if}
		</div>
	</div>
{:else}
	<div class="fixed grid place-items-center w-full h-full">
		<h>404 User Not Found</h>
	</div>
{/if}
