<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import ReactDOM from 'react-dom/client';
	import { jsx } from 'react/jsx-runtime';

	let editor = $state<HTMLDivElement>();
	let root = $state<ReactDOM.Root>();
	let { text = $bindable() }: { text: string } = $props();

	onMount(() => {
		import('./Editor.tsx').then((module) => {
			if (browser && editor) {
				root = ReactDOM.createRoot(editor);
				root.render(
					jsx(module.default, {
						initialText: text,
						onChange: (newText: string) => {
							text = newText;
						}
					})
				);
			}
		});
		return () => root?.unmount();
	});

	export const getContent = () => {};
</script>

<div bind:this={editor}>Loading Editor...</div>

<style>
</style>
