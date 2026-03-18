<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import ReactDOM from 'react-dom/client';
	import { jsx } from 'react/jsx-runtime';
	import type { YfmStaticViewProps } from '@gravity-ui/markdown-editor';
	import React from 'react';

	let editor = $state<HTMLDivElement>();
	let root = $state<ReactDOM.Root>();
	let props: YfmStaticViewProps = $props();

	onMount(() => {
		Promise.all([
			import('@gravity-ui/markdown-editor'),
			import('@diplodoc/latex-extension/react')
		]).then((modules) => {
			if (browser && editor) {
				root = ReactDOM.createRoot(editor);
				root.render(
					jsx(React.Fragment, {
						children: [jsx(modules[0].YfmStaticView, props), jsx(modules[1].LatexRuntime, {})]
					})
				);
			}
		});
		return () => root?.unmount();
	});

	export const getContent = () => {};
</script>

<div bind:this={editor}>Loading Markdown...</div>

<style>
</style>
