<script lang>
	import loader from '@monaco-editor/loader';
	import { onDestroy, onMount } from 'svelte';
	import { restoreHistory, updateHistory, clearHistory } from '$lib/history';

	// export const setValue = () => {
	// 	value = editor.getValue();
	// };

	let {
		value = $bindable('#include<stdio.h>\n\nint main(){ \n\n  return 0;\n}'),
		problem = $bindable(),
		handleReset = $bindable(),
		getContent = () => {
			return editor.getValue();
		}
	} = $props();

	/**
	 * @type {import("monaco-editor").editor.IStandaloneCodeEditor}
	 */
	let editor;
	let monaco;
	let editorContainer = $state();

	let mounted = $state(false);
	let totalSize = 0.0;

	handleReset = () => {
		clearHistory(problem.id);
		if (editor) {
			editor.setValue(problem.starter_code);
		}
	};

	onMount(async () => {
		//restore user history
		value = restoreHistory(problem.id, value);

		// Remove the next two lines to load the monaco editor from a CDN
		// see https://www.npmjs.com/package/@monaco-editor/loader#config
		const monacoEditor = await import('monaco-editor');
		loader.config({ monaco: monacoEditor.default });

		monaco = await loader.init();

		// Define a custom theme based on vs-dark with a lighter background
		monaco.editor.defineTheme('custom-vs-dark', {
			base: 'vs-dark',
			inherit: true,
			rules: [],
			colors: {
				'editor.background': '#1f1f1f' // Lighter background color
			}
		});

		// Your monaco instance is ready, let's display some code!
		if (editorContainer === undefined)
			editor = monaco.editor.create(document.body, {
				value: value,
				language: 'c',
				automaticLayout: true,
				theme: 'custom-vs-dark' // Use the custom theme
			});
		else {
			editor = monaco.editor.create(editorContainer, {
				value: value,
				language: 'c',
				automaticLayout: true,
				theme: 'custom-vs-dark' // Use the custom theme
			});
		}

		editor.onDidChangeModelContent((e) => {
			//console.log(e.changes[0])

			//make your object that optimized

			/**
			 * change[0] = number of characters that will be replaced
			 * change[1] = string/character that will be inserted at index
			 * change[2] = index of change
			 * change[3] = timestamp
			 */
			const change = [
				e.changes[0].rangeLength,
				e.changes[0].text,
				e.changes[0].rangeOffset,
				Date.now()
			];
			/*
            const size = new TextEncoder().encode(JSON.stringify(change)).length
            const kiloBytes = size / 1024;
            totalSize += kiloBytes
            console.log("total size of history (MB): " + (totalSize / 1000))
            */
			value = editor.getValue();
			updateHistory(problem.id, JSON.stringify(change));
		});

		mounted = true;
	});
</script>

<div class="grow shadow-inner border-t-2 overflow-hidden">
	<div class="w-full h-full {!mounted && 'bg-[#1f1f1f]'}" bind:this={editorContainer}>
		{#if !mounted}
			<p class="content-center w-full h-full text-grey-400">loading editor...</p>
		{/if}
	</div>
</div>
