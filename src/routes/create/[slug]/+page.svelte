<script lang="ts">
	import close from '../../../lib/assets/close.svg';
	import done from '../../../lib/assets/done.svg';
	import add from '../../../lib/assets/add-plus.svg';
	import deleteButton from '../../../lib/assets/delete.svg';
	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import Console from '$lib/components/Console.svelte';
	import TestCaseFeedBackIcon from '$lib/components/TestCaseFeedBackIcon.svelte';
	import TestCaseDisplay from '$lib/components/TestCaseDisplay.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import edit from 'svelte-awesome/icons/edit';
	import { goto } from '$app/navigation';
	import fa from 'svelte-awesome/icons/fa';
	import { createTestScript, generateStarterCode } from '$lib/utils/createTestScript';
	import { derived } from 'svelte/store';
	import type { Monaco } from '@monaco-editor/loader';
	import type { MouseEventHandler } from 'svelte/elements';

	let innerWidth = $state(0); //gets the width of the page
	let offset = $state(0); //offset state, determines how much more pixels should be taken by the right panel.
	let leftWidth = $derived(innerWidth / 2 + offset);
	let rightWidth = $derived(innerWidth - leftWidth);

	let title = $state('');
	let editorRef: Editor;
	let codeEditorRef = $state('');
	let codeEditorProblem = $state({
		id: 'createProblem',
		starter_code: 'int is_prime(int n) { \n // Write your code here \n}'
	});

	let testFunctionRef = $state('');
	let testFunctionProblem = $state({
		id: 'createProblemTestFunction',
		starter_code:
			'#include <stdio.h>\nint is_prime(int n) { if (n <= 1) return 0; for (int i = 2; i * i <= n; i++) { if (n % i == 0) return 0; } return 1; }\nint main() { int test_cases[5] = {2, 4, 17, 18, 29}; int expected_results[5] = {1, 0, 1, 0, 1}; for (int i = 0; i < 5; i++) { if (is_prime(test_cases[i]) != expected_results[i]) { printf("Test case %d failed.\\n", test_cases[i]); return 1; } } printf("All test cases passed.\\n"); return 0; }'
	});

	let toggleConsole = $state(false);
	let toggleTestResults = $state(false);
	let consoleContent = $state([]);
	let unreadConsole = $state(false);
	let test_failed = $state([]);
	let test_passed = $state([]);
	let test_failed_count = $derived(test_failed.length);
	let test_passed_count = $derived(test_passed.length);
	let isPassed = $state(-1);
	let functionName = $state('');
	let returnType = $state('');
	let isTestCase = $state(false);
	let testCaseInputTypes = $state<string[]>([]);
	let testCases = $state([
		{
			inputs: [],
			inputTypes: [],
			output: '',
			outputType: '',
			operator: ''
		}
	]);
	let testCasesVals = $state([0]);
	let testCaseInputCount = $state(1);
	let isTestCaseFilled = $derived.by(() => {
		let allInputsFilled = testCases.every(
			(tc) =>
				tc.inputs.length === testCaseInputCount &&
				tc.inputs.every((input) => input !== undefined && input !== '') &&
				tc.output !== undefined &&
				tc.output !== '' &&
				tc.operator !== undefined &&
				tc.operator !== ''
		);

		return (
			allInputsFilled &&
			testCaseInputTypes.length > 0 &&
			testCaseInputTypes.every((type) => type !== 'Type' && type !== '') &&
			functionName !== '' &&
			returnType !== '' &&
			returnType !== 'Return Type'
		);
	});

	let testScript = $derived.by(() => {
		if (isTestCaseFilled) {
			return createTestScript(
				returnType,
				functionName,
				testCaseInputTypes.slice(0, testCaseInputCount),
				testCases
			);
		}
		return '';
	});

	let testCaseStarterCode = $derived.by(() => {
		if (isTestCaseFilled) {
			return generateStarterCode(
				returnType,
				functionName,
				testCaseInputTypes.slice(0, testCaseInputCount)
			);
		}
		return '';
	});

	let handleReset = $state(() => {});

	const addTestCase = () => {
		testCases.push({
			inputs: [],
			inputTypes: [],
			output: '',
			outputType: '',
			operator: ''
		});
	};

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

	const runCode = async () => {
		let toSubmit = testFunctionRef + '\n' + codeEditorRef;
		const res = await fetch('/api/compile', {
			method: 'POST',
			body: JSON.stringify({ code: toSubmit })
		});
		const data = await res.json();

		let now = new Date();
		let timeString = now.toLocaleTimeString();
		let output = timeString + ' : ' + data.run.output;
		// @ts-ignore
		consoleContent = [...consoleContent, output];
		if (data.run.code == 0) {
			isPassed = 0;
		} else {
			isPassed = 1;
			test_failed = data.run.test_failed;
			test_passed = data.run.test_passed;
		}

		if (toggleConsole == false) {
			unreadConsole = true;
		}
	};

	const submit = async () => {
		const description = editorRef.getContent();

		if (isTestCase) {
			if (isTestCaseFilled) {
				const formData = new FormData();
				formData.append('title', title);
				formData.append('description', description);
				formData.append('test_function', testScript);
				formData.append('starterCode', testCaseStarterCode);

				const res = await fetch('?/createProblem', {
					method: 'POST',
					body: formData
				});

				if (res.ok) {
					goto('/');
				} else {
					alert('Problem creation failed');
				}
			} else {
				alert('Please fill all fields before submitting.');
				return;
			}
		} else {
			const formData = new FormData();
			formData.append('title', title);
			formData.append('description', description);
			formData.append('test_function', testFunctionRef);
			formData.append('starterCode', codeEditorRef);

			const res = await fetch('?/createProblem', {
				method: 'POST',
				body: formData
			});

			if (res.ok) {
				goto('/');
			} else {
				alert('Problem creation failed');
			}
		}
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
		{#if !isTestCase}
			<div class="w-9/10 m-auto mt-10">
				<div tabindex="0" role="button" class="text-2xl mb-3">Test Function</div>
				<div class="h-96 w-full border flex flex-col">
					<CodeEditor
						bind:value={testFunctionRef}
						bind:problem={testFunctionProblem}
						bind:handleReset
					/>
				</div>
			</div>
		{/if}
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="w-2 cursor-col-resize flex justify-center items-center bg-black/30"
		id="divider"
		onmousedown={startResize}
	>
		<!-- <button class="w-full" title="reset sizing" onclick={resetResize}> | </button> -->
	</div>

	<div class="flex flex-col overflow-auto" style={`width : ${rightWidth}px`}>
		<span class="flex items-end justify-between gap-3 px-3 w-full h-15 pt-1 pb-2">
			<div class="self-center justify-self-center">
				{isTestCase ? 'Test Cases' : 'Starter Code'}
			</div>
			<div class="flex gap-3">
				{#if !isTestCase}
					<TestCaseFeedBackIcon
						bind:toggleTestResults
						{test_failed_count}
						test_passed_count={test_passed.length}
						{isPassed}
					/>
				{/if}
				<button
					class="btn btn-outline border border-gray-700"
					onclick={() => {
						isTestCase = !isTestCase;
					}}
				>
					{isTestCase ? 'Test Cases' : 'Test Function'}
				</button>

				{#if !isTestCase}
					<button class="btn btn-outline border border-gray-700" onclick={runCode}> Run </button>
				{/if}
				<button class="btn bg-[#006239] text-white hover:bg-[#004327]" onclick={submit}>
					Finish
				</button>
			</div>
		</span>

		{#if isTestCase}
			<div class="h-96 w-full flex flex-col border-t border-t-white p-3">
				<div class="flex flex-row items-center gap-3 mb-3">
					<input
						type="text"
						class="input input-bordered w-1/2 bg-inherit"
						placeholder="Function Name"
						bind:value={functionName}
					/>
					<select class="select select-bordered w-36 join-item bg-inherit" bind:value={returnType}>
						<option disabled selected value="">Return Type</option>
						<option>int</option>
						<option>float</option>
						<option>char</option>
					</select>
					<div class="join h-full">
						<div class="badge badge-neutral join-item grid place-items-center h-full">
							Parameter Count
						</div>
						<input
							type="number"
							class="input input-bordered w-24 join-item bg-inherit"
							placeholder="Parameters"
							bind:value={testCaseInputCount}
						/>
					</div>
				</div>

				<!-- Input Types Section (moved outside test cases loop) -->
				<div class="flex flex-col gap-2 mb-4">
					{#each Array(testCaseInputCount) as _, inputIndex}
						<div class="join w-full">
							<div class="badge badge-neutral join-item h-full grid place-items-center px-4">
								Parameter {inputIndex + 1}
							</div>
							<select
								class="select select-bordered w-24 join-item bg-inherit"
								bind:value={testCaseInputTypes[inputIndex]}
							>
								<option disabled selected>Type</option>
								<option>int</option>
								<option>int[]</option>
								<option>float</option>
								<option>float[]</option>
								<option>char</option>
								<option>char[]</option>
							</select>
						</div>
					{/each}
				</div>

				<div class="flex flex-col gap-3">
					{#each testCases as testCase, index}
						<div class="flex flex-col gap-2">
							<!-- Input Values Section -->
							{#each Array(testCaseInputCount) as _, inputIndex}
								<div class="flex flex-row items-center gap-3">
									<div class="join flex-grow">
										{#if testCaseInputTypes[inputIndex]?.includes('[]')}
											<input
												type="text"
												placeholder={`Input ${inputIndex + 1} (comma-separated)`}
												class="input input-bordered w-full bg-inherit"
												bind:value={testCase.inputs[inputIndex]}
											/>
										{:else}
											<input
												type="text"
												placeholder={`Input ${inputIndex + 1}`}
												class="input input-bordered w-full bg-inherit"
												bind:value={testCase.inputs[inputIndex]}
											/>
										{/if}
									</div>
								</div>
							{/each}

							<!-- Output Section (simplified) -->
							<div class="flex flex-row items-center gap-3">
								<select
									class="select select-bordered w-32 bg-inherit"
									bind:value={testCase.operator}
								>
									<option disabled selected>Operator</option>
									<option>==</option>
									<option>!=</option>
									<option>&gt;</option>
									<option>&lt;</option>
									<option>&gt;=</option>
									<option>&lt;=</option>
								</select>

								<div class="join flex-grow">
									<input
										type="text"
										placeholder="Expected Output"
										class="input input-bordered w-full bg-inherit"
										bind:value={testCase.output}
									/>
								</div>

								<!-- Add/Delete buttons -->
								{#if index === testCases.length - 1}
									<button class="btn btn-outline btn-circle btn-sm" onclick={() => addTestCase()}>
										<img src={add} alt="add" class="h-6" />
									</button>
								{:else}
									<button
										class="btn btn-outline btn-circle btn-sm"
										onclick={() => testCases.splice(index, 1)}
									>
										<img src={deleteButton} alt="delete" class="h-5" />
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				{#if isTestCaseFilled}
					<div class="flex flex-col mt-10 gap-4">
						<div>
							<div class="text-l mb-2">Test Script (Hidden from Students):</div>
							<pre class="bg-black/30 p-4 rounded-lg">
								{testScript}
							</pre>
						</div>
						<div>
							<div class="text-l mb-2">Starter Code (Shown to Students):</div>
							<pre class="bg-black/30 p-4 rounded-lg">
								{testCaseStarterCode}
							</pre>
						</div>
					</div>
				{:else}
					<div class="flex justify-center mt-10 bg-black/30 p-2 rounded-lg">
						Please fill all fields to see testing script.
					</div>
				{/if}
			</div>
		{:else}
			<CodeEditor bind:value={codeEditorRef} bind:problem={codeEditorProblem} bind:handleReset />
		{/if}

		<TestCaseDisplay bind:toggleTestResults {test_passed} {test_failed} />

		{#if !isTestCase}
			<Console bind:toggleConsole {consoleContent} bind:unreadConsole />
		{/if}
	</div>
</div>
