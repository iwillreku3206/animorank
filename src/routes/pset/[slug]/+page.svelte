<script>
	// @ts-nocheck
	import Page404 from '$lib/components/Page404.svelte';
	import Page from '../../+page.svelte';
	let { data } = $props();

	const subcribe = async () => {
		const res = await fetch('/api/subscribe', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				problem_set: data.pset[0].id,
				student_email: data.user.email,
				status: 'pending'
			})
		});

		if (res.ok) {
			console.log('Subscribed');
		} else {
			console.log('Failed to subscribe');
		}
	};
</script>

{#if data?.pset.length > 0}
	<div class="w-screen bg-[#121212]">
		<div class="mx-auto border mt-8 rounded border-borderColor w-8/12">
			<div class="flex flex-col justify-between border-b border-borderColor p-5">
				<div class="text-2xl">{data?.pset[0].title}</div>
				<p class="indent-10 mt-5">{data?.pset[0].description}</p>
				<div class="flex flex-row justify-end mt-10">
					<p>By {data['pset'][0].Teacher.name}</p>
				</div>
				<!-- <div class="flex flex-row justify-end gap-3 mt-6">
					{#if data?.user?.role === 'student'}
						<button class="btn bg-[#006239] text-white hover:bg-[#004327]" onclick={subcribe}
							>Subscribe</button
						>
					{:else}
						<button class="btn bg-[#006239] text-white hover:bg-[#004327]" disabled
							>Subscribe</button
						>
					{/if}
				</div> -->
			</div>

			<div>
				{#each data?.problems as problem}
					<h3 class="px-6 pt-2 pb-2 cursor-pointer hover:bg-[#252525]">{problem.problem_name}</h3>
				{/each}
			</div>
		</div>
	</div>
{:else}
	<Page404 />
{/if}
