<script lang="ts">
	import close from '$lib/assets/close.svg';
	import type { ProblemSet } from './+page.server';
	let { pset }: { pset: ProblemSet } = $props();

	let toggle = $state(false);
</script>

{#if !toggle}
	<button
		class="mt-8 min-h-72 w-96 sm:mr-5 p-3 bg-[#1F1F1F] rounded cursor-pointer flex flex-col hover:bg-[#252525] transform transition-transform hover:scale-105"
		onclick={() => (toggle = !toggle)}
	>
		<div class="flex justify-between pt-2 pb-2">
			<div class="text-xl">{pset.title}</div>
			<div class="flex align-center justify-center items-center">
				<p class="text-sm mr-2 text-center text-gray-400">By {pset.teacher?.name}</p>
			</div>
		</div>
		<div class="mt-3 self-start text-left px-3">
			<p class="indent-8">{pset.description}</p>
		</div>
		<div class="flex flex-row justify-end mt-3 w-full flex-wrap pb-2">
			<p class="text-gray-400 text-sm">{pset.problems.length} Problem(s)</p>
		</div>
	</button>
{:else}
	<div
		class="w-full mt-8 min-h-72 p-3 bg-[#1F1F1F] rounded cursor-pointer flex flex-col flex-wrap order-first"
	>
		<div>
			<div class="w-full flex justify-between">
				<h2 class="text-2xl mb-4">{pset.title}</h2>
				<div class="flex flex-row align-center justify-center items-center">
					<img
						src={pset.teacher?.profile_url}
						alt="profile"
						class="h-8 w-8 object-cover rounded-full mr-2"
					/>
					<p class="text-sm mr-2 text-gray-400">{pset.teacher?.name || 'Unknown User'}</p>
				</div>
			</div>
			<div class="px-3 pb-5 w-full">
				{pset.description}
			</div>
		</div>

		<!-- Problems -->
		<div class="flex justify-between w-full flex-wrap">
			<div class="mt-5 mb-5 w-ful w-full">
				<div class="flex align-middle justify-between border-b border-borderColor p-3">
					<div class="text-xl">Problems</div>
					<p class="text-gray-400 text-sm">{pset.problems.length} Problem(s)</p>
				</div>
				<div class="flex flex-col w-full">
					{#each pset.problems as problem}
						<a
							href="/problem2/{problem.id}"
							data-sveltekit-preload-data="tap"
							class="flex justify-between p-2 align-middle text-center cursor-pointer hover:bg-[#252525] transform transition-transform w-full"
						>
							<h3 class="mt-auto mb-auto ml-4">{problem.name}</h3>
						</a>
					{/each}
				</div>
			</div>
		</div>

		<div class="flex justify-end w-full mt-8 sm:mt-20">
			<button
				class="btn btn-s mr-2 bg-[#121212] border-0 hover:bg-[#090909]"
				onclick={() => (toggle = false)}
			>
				<img src={close} alt="edit" class="h-6 cursor-pointer" />
			</button>
		</div>
	</div>
{/if}

<!-- // 	{#if toggle}
// 		<div class="flex flex-col">
// 		{#each Problems as Problem}
// 		<a href="/problem/{Problem.id}" class="px-6 pt-2 pb-2 w-full cursor-pointer hover:bg-[#252525]">{Problem.problem_name}</a>
// 		{/each}	
// 		</div>
// 	{/if} -->
