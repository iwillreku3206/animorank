<script lang="ts">
	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import edit from 'svelte-awesome/icons/edit';
	import type { MouseEventHandler } from 'svelte/elements';

	let innerWidth = $state(0); //gets the width of the page
	let offset = $state(0); //offset state, determines how much more pixels should be taken by the right panel.
	let leftWidth = $derived(innerWidth / 2 + offset);
	let rightWidth = $derived(innerWidth - leftWidth);

	let title = $state('');
	let requiredOutput = $state('');
	let editorRef: Editor;
	let codeEditorRef: CodeEditor;

	let starterCode = $state('');

	//start resize, called when the mouse is held down on the resize bar. assigns a listener on mousemove which modifies the offset state.
	const startResize: MouseEventHandler<HTMLDivElement> = (e) => {
		let initial = e.clientX;
		document.onmousemove = (e) => {
			offset -= leftWidth - e.clientX;
		};
	};

	//stops resize, called on mouseUp, removes the listener for mousemove.
	const abortResize = () => {
		document.onmousemove = null;
	};

	//resets resize. this function is called when the middle button of the resize bar is clicked. setting offset back to 0.
	const resetResize = () => {
		offset = 0;
	};

	const submit = async () => {
		const description = editorRef.getContent();

		const formData = new FormData();
		formData.append('title', title);
		formData.append('description', description);
		formData.append('requiredOutput', requiredOutput);
		formData.append('starterCode', starterCode);

		const res = await fetch('?/createProblem', {
			method: 'POST',
			body: formData
		});
	};
</script>

<svelte:window onmouseup={abortResize} bind:innerWidth />

<!--Use grow class on your divs if you want no scroll bar, otherwise the content will just overflow all good-->
<div class="flex justify-start grow overflow-auto relative">
	<div class=" pl-5 pt-5 pr-3 pb-10 overflow-auto" style={`width : ${leftWidth}px`}>
		<div class="w-9/10 m-auto">
			<h2 class="text-2xl mb-3">Problem Title</h2>
			<input
				type="text"
				class="input input-bordered w-full bg-inherit"
				placeholder="Problem Title"
				bind:value={title}
			/>
		</div>

		<div class="w-9/10 m-auto mt-10">
			<h2 class="text-2xl mb-3">Edit Problem Description</h2>
			<div class="m-auto">
				<Editor bind:this={editorRef} />
			</div>
		</div>
		<div class="w-9/10 m-auto mt-10">
			<h2 class="text-2xl mb-3">Required output</h2>
			<div class=" rounded-lg mt-3">
				<textarea
					class="textarea textarea-bordered w-full bg-inherit"
					placeholder="Required Console Output"
					bind:value={requiredOutput}
				></textarea>
			</div>
		</div>
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="w-2 cursor-col-resize flex justify-center items-center bg-black/30"
		id="divider"
		onmousedown={startResize}
	>
		<!-- <button class="w-full" title="reset sizing" onclick={resetResize}> | </button> -->
	</div>

	<div class="flex flex-col" style={`width : ${rightWidth}px`}>
		<span class="flex items-end justify-between gap-3 px-3 w-full pt-1 pb-2 grow">
			<div class="self-center justify-self-center">Starter Code</div>

			<div class="flex gap-3">
				<button class="btn btn-outline border border-gray-700"> Run </button>
				<button class="btn bg-[#006239] text-white hover:bg-[#004327]" onclick={submit}>
					Finish
				</button>
			</div>
		</span>

		<CodeEditor bind:this={codeEditorRef} bind:value={starterCode} />
	</div>
</div>
