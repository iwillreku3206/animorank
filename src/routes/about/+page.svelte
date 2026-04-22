<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { signIn } from '@auth/sveltekit/client';
</script>

<svelte:head>
	<title>Animorank</title>
	<script async defer src="https://buttons.github.io/buttons.js"></script>
</svelte:head>

<div class="blob-cont">
	<div class="green blob"></div>
	<div class="green blob"></div>
	<div class="green blob"></div>
</div>

<main class="px-16 opacity-80">
	<div
		class="w-full flex flex-col xl:flex-row gap-20 justify-center items-center"
		style="min-height: calc(100vh - 80px);"
	>
		<div class="flex flex-col gap-24">
			<div class="flex flex-col items-start gap-8 w-full">
				<h2 class="text-base-content text-7xl font-bold" style="letter-spacing: -4px;">
					Master Programming<br />with <span class="text-primary">AnimoRank</span>
				</h2>
				<h2 class="text-base-content text-base">
					Work through curated programming problems aligned with DLSU's CCPROG series. <br />
					Track your growth and build real skills — one problem at a time.
				</h2>
			</div>
			<div class="flex items-center gap-4">
				<Button>Start Coding</Button>
				<div>
					<span class="text-base-content text-base">View Demo</span>
				</div>
			</div>
		</div>
		<img
			src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Cm92ASBTFf/ekk9i7k9_expires_30_days.png"
			class="w-lg aspect-auto"
		/>
	</div>
	<div class="w-full flex flex-col gap-20 justify-center items-center">
		<h2>Everything you need for the CCPROG series.</h2>
		<div class="flex flex-row gap-32">
			<div class="flex flex-col gap-10">
				<h3 class="text-3x font-boldl">Problem Sets</h3>
				<div>
					AnimoRank offers a curated collection of programming problems designed to align with the
					<span class="text-primary">CCPROG series at DLSU</span>. Because the problems are drawn
					from the same material covered in your actual coursework, practicing on AnimoRank directly
					reinforces what you're learning in class.
				</div>
			</div>
		</div>
	</div>
</main>

<style>
	/* Blobs */

	.blob-cont {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		z-index: 5;
		height: 100%;
		width: 100%;
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

		background-color: var(--color-primary);
		position: absolute;
		top: 30px;
		right: 50px;
		height: 200px;
		width: 250px;
		animation-name: blob;
	}

	@keyframes blob {
		0% {
			opacity: 0;
			top: 80px;
			right: -20px;
			transform: scale(1.2);
		}
		15% {
			opacity: 0.3;
			top: 280px;
			right: 40px;
			transform: scale(1);
		}
		30% {
			opacity: 0.1;
			top: 350px;
			right: -10px;
			transform: scale(1.1);
		}
		45% {
			opacity: 0.3;
			top: 200px;
			right: 80px;
			transform: scale(1);
		}
		60% {
			opacity: 0.2;
			top: 320px;
			right: 30px;
			transform: scale(1.1);
		}
		75% {
			opacity: 0.1;
			top: 150px;
			right: 50px;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			top: 80px;
			right: -20px;
			transform: scale(1.2);
		}
	}
</style>
