<script lang="ts">
	import { onMount } from 'svelte';
	import { type monaco } from '$lib/monaco';
	import { browser } from '$app/environment';

	// export const setValue = () => {
	// 	value = editor.getValue();
	// };

	let {
		code = $bindable(),
		language,
		...rest
	}: { code: string; language?: string; class?: string } = $props();

	let monacoInstance: monaco.editor.IStandaloneCodeEditor | undefined = $state();
	let editorContainer = $state<HTMLDivElement>();

	onMount(() => {
		if (!browser) return;
		import('$lib/monaco').then((module) => {
			if (!editorContainer) return;
			const { monaco } = module;

			monacoInstance = monaco.editor.create(editorContainer, {
				bracketPairColorization: {
					enabled: true
				},
				value: code,
				automaticLayout: true,
				fontFamily: 'JetBrains Mono',
				language,
				minimap: {
					enabled: false
				},
				theme: 'vs-dark',
				wordWrap: 'on'
			});

			monacoInstance.onDidChangeModelContent((e) => {
				code = monacoInstance?.getValue() || '';
			});

			return () => monacoInstance?.dispose();
		});
	});
</script>

<div class="w-full h-full {rest.class}" bind:this={editorContainer}>
	{#if !monacoInstance}
		<p class="content-center w-full h-full text-grey-400">loading editor...</p>
	{/if}
</div>
