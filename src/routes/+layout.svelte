<script lang="ts">
	import '../app.css';
	import 'katex/dist/katex.min.css';
	import '@gravity-ui/uikit/styles/fonts.css';
	import '@gravity-ui/uikit/styles/styles.css';

	import MobileSettingsModal from '$lib/components/MobileSettingsModal.svelte';
	import type { LayoutServerData } from './$types';
	import { signIn } from '@auth/sveltekit/client';
	import Button from '$lib/components/Button.svelte';

	let openSettings = $state(false);
	interface Props {
		data: LayoutServerData;
		children?: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();

	let loggedIn = $derived(!!data.user);
</script>

<div class="flex flex-col h-screen bg-[#121212] text-white">
	<!--Navbar start-->
	<div class="min-h-20 px-9 flex flex-row items-center border-b-">
		<div class="relative mr-auto">
			<h1 class="font-bold text-2xl">
				<a href="/">Animorank</a>
			</h1>
		</div>

		<div class="flex flex-row ml-auto mr-auto">
			<a class="px-4 text-base" href="/about">About Us</a>
			<a class="px-4 text-base" href="/">Dashboard</a>
			<a class="px-4 text-base" href="/problemSets">Problem Sets</a>
		</div>

		<div class="ml-auto">
			{#if loggedIn}
				<!--<button class="btn btn-ghost md:hidden" onclick={() => (openSettings = true)}>
          <img src={menu} alt="menu" class="h-10 cursor-pointer" />
        </button>-->
				<button
					class="btn btn-ghost hidden md:grid md:place-items-center overflow-hidden btn-circle"
					onclick={() => (openSettings = true)}
				>
					<img
						src={data.user?.image}
						alt="profile"
						class="h-10 w-10 object-cover rounded-full cursor-pointer"
					/>
				</button>
			{:else}
				<Button onclick={() => signIn('google')}>Login</Button>
			{/if}
		</div>
	</div>

	{@render children?.()}

	{#if openSettings && loggedIn && data.user}
		<MobileSettingsModal bind:openSettings user={data.user} />
	{/if}
</div>
