<script lang="ts">
	import Page404 from '$lib/components/Page404.svelte';
	let { data } = $props();
</script>

{#if data.pset}
	<div class="w-screen bg-[#121212]">
		<div class="mx-auto border mt-8 rounded border-borderColor w-8/12">
			<div class="flex flex-col justify-between border-b border-borderColor p-5">
				<div class="text-2xl">{data.pset.title}</div>
				<p class="indent-10 mt-5">{data.pset.description}</p>
				<div class="flex flex-row justify-end mt-10">
					<p>By {data.pset.teacher?.name || ''}</p>
				</div>
			</div>

			<div>
				{#each data.pset.problems as problem}
					<h3 class="px-6 pt-2 pb-2 cursor-pointer hover:bg-[#252525]">{problem.name}</h3>
				{/each}
			</div>
		</div>
	</div>
{:else}
	<Page404 />
{/if}
