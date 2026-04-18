<script lang="ts">
	import { openTerms } from '$lib/state/terms.svelte';
	import { signIn } from '@auth/sveltekit/client';
</script>

<svelte:head>
	<title>Animorank</title>
	<script async defer src="https://buttons.github.io/buttons.js"></script>
</svelte:head>

<div
	class="w-full flex flex-col items-center justify-center min-h-[140%] md:min-h-[120%] overflow-auto bg-[#121212]"
>
	<div class="flex flex-col items-center justify-center w-full h-[120%] md:h-full p-4 z-10">
		<div class="bg-[#121D18] rounded-2xl p-2 px-4 flex w-fit text-forestGreen text-xs">
			Curated by Professors, Built by Students
		</div>
		<div
			class="font-sans text-5xl lg:text-7xl font-bold mt-4 flex flex-col justify-center items-center lg:flex-row text-center"
		>
			Practice with Animorank
		</div>
		<div class="mt-4 text-gray-400 text-base block md:hidden text-center">
			Practice, and improve your programming skills with challenges designed for DLSU students
		</div>
		<div class="mt-4 text-gray-400 text-xl hidden md:block">
			Practice, and improve your programming skills with challenges
		</div>
		<div class="text-gray-400 text-xl hidden md:block">designed for the CCPROG series</div>
		<button
			class="btn btn-outline mt-5"
			onclick={() => {
				signIn('google');
			}}>Get Started</button
		>
	</div>
	<div class="blob-cont">
		<div class="yellow blob"></div>
		<div class="red blob"></div>
		<div class="green blob"></div>
	</div>
	<footer class="bg-black py-8 px-8 w-full z-10">
		<div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
			<div>
				<div class="flex flex-row items-center mb-2 align-center">
					<span class="font-semibold mr-2">Animorank</span>
					<div class="mt-2">
						<a
							class="github-button"
							href="https://github.com/ivanenclonar/animorank"
							data-color-scheme="no-preference: light; light: light; dark: dark;"
							data-size="large"
							data-show-count="true"
							aria-label="Star ivanenclonar/animorank on GitHub">Star</a
						>
					</div>
				</div>
				<p class="text-gray-400 text-sm">
					A dedicated practice coding platform for students who want to master programming through
					structured challenges and hands-on learning, designed for CCPROG students.
				</p>
			</div>

			<div class="flex flex-col md:items-end">
				<ul class="text-gray-400 text-sm">
					<li class="font-semibold mb-2 text-white">Connect</li>
					<li class="mb-1 hover:text-white cursor-pointer">
						<button
							onclick={() => {
								openTerms.contact = true;
							}}
							class="mb-1 hover:text-white cursor-pointer block">Contact Us</button
						>
					</li>
					<li class="mb-1 hover:text-white cursor-pointer">
						<a
							href="https://forms.gle/uDpnjEoYkyjHZsWVA"
							class="mb-1 hover:text-white cursor-pointer block">Feedback</a
						>
					</li>
					<li class="mb-1 hover:text-white cursor-pointer">
						<button
							onclick={() => {
								openTerms.open = true;
							}}
							class="mb-1 hover:text-white cursor-pointer block">Terms of Service</button
						>
					</li>
				</ul>
			</div>
		</div>

		<div class="text-center text-gray-500 text-xs mt-10">
			© 2025 AnimoRank. All rights reserved.
		</div>
	</footer>
</div>

<style>
	/* Blobs */

	.blob-cont {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		z-index: 5;
		height: 900px;
		width: 900px;
		position: absolute;
		right: 5em;
	}

	.blob {
		border: 1px solid white;
		border-radius: 200px;
		filter: blur(60px);
		opacity: 0;
		animation-duration: 20s;
		animation-timing-function: ease;
		animation-iteration-count: infinite;
	}

	.yellow {
		background-color: #025130;
		position: absolute;
		top: 200px;
		right: 50px;
		height: 300px;
		width: 300px;
		animation-name: yellow;
	}

	.green {
		background-color: #114d32;
		position: absolute;
		top: 30px;
		right: 50px;
		height: 200px;
		width: 250px;
		animation-name: green;
	}

	.red {
		background-color: #11472f;
		position: absolute;
		right: 0;
		top: 300px;
		height: 250px;
		width: 200px;
		animation-name: red;
	}

	@keyframes yellow {
		0% {
			opacity: 0;
			top: 200px;
			left: 100px;
			transform: scale(1);
		}
		30% {
			opacity: 1;
			top: 300px;
			left: 150px;
			transform: scale(1.2);
		}
		60% {
			opacity: 1;
			top: 100px;
			left: 200px;
			transform: scale(1.3);
		}
		100% {
			opacity: 0;
			top: 200px;
			left: 100px;
			transform: scale(1);
		}
	}

	@keyframes green {
		0% {
			opacity: 0;
			top: 80px;
			right: -20px;
			transform: scale(1.2);
		}
		30% {
			opacity: 1;
			top: 300px;
			right: -20px;
			transform: scale(1);
		}
		60% {
			opacity: 1;
			top: 200px;
			right: 100px;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			top: 80px;
			right: -20px;
			transform: scale(1.2);
		}
	}

	@keyframes red {
		0% {
			opacity: 0;
			top: 250px;
			right: 0px;
			transform: scale(1);
		}
		30% {
			opacity: 1;
			top: 150px;
			right: 150px;
			transform: scale(1.4);
		}
		60% {
			opacity: 1;
			top: 250px;
			right: 100px;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			top: 250px;
			right: 0px;
			transform: scale(1);
		}
	}
</style>
