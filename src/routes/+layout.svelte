<script lang="ts">
	import '../app.css';
	import { openLogin } from '$lib/state/login.svelte';
	import menu from '$lib/assets/menu.svg';
	import MobileLoginModal from '$lib/components/MobileLoginModal.svelte';
	import MobileSettingsModal from '$lib/components/MobileSettingsModal.svelte';
	import SignUpModal from '$lib/components/SignUpModal.svelte';
	import TermsModal from '$lib/components/TermsModal.svelte';
	import ContactModal from '$lib/components/ContactModal.svelte';

	let openSettings = $state(false);
	interface Props {
		data: any;
		children?: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();
	const { user } = data;

	let loggedIn = $derived(user !== null);
</script>

<div class="flex flex-col h-screen bg-[#121212] text-white">
	<!--Navbar start-->
	<div class="navbar h-16 px-3 border-b-2 border-borderColor flex justify-between">
		<div class="relative">
			<a href="/" class="cursor-pointer font-bold text-xl font-poppins_h">Animorank</a>
		</div>

		{#if loggedIn}
			<button class="btn btn-ghost md:hidden" onclick={() => (openSettings = true)}>
				<img src={menu} alt="menu" class="h-10 cursor-pointer" />
			</button>
			<button
				class="btn btn-ghost hidden md:grid md:place-items-center overflow-hidden btn-circle"
				onclick={() => (openSettings = true)}
			>
				<img
					src={user?.picture}
					alt="profile"
					class="h-10 w-10 object-cover rounded-full cursor-pointer"
				/>
			</button>
		{:else}
			<button class="btn btn-outline" onclick={() => (openLogin.open = true)}> Login </button>
		{/if}
	</div>

	{@render children?.()}

	{#if openLogin.open && !loggedIn}
		<MobileLoginModal />
	{/if}

	{#if openLogin.openSignUp && !loggedIn}
		<SignUpModal />
	{/if}

	{#if openSettings && loggedIn}
		<MobileSettingsModal bind:openSettings {user} />
	{/if}

	<TermsModal />

	<ContactModal />
</div>
