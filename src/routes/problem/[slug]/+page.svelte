<script lang="ts">
	import CodeEditor from '$lib/components/CodeEditor.svelte';
	import Console from '$lib/components/Console.svelte';
	import { marked } from 'marked';
	import { onMount, onDestroy } from 'svelte';
	import TestCaseDisplay from '$lib/components/TestCaseDisplay.svelte';
	import TestCaseFeedBackIcon from '$lib/components/TestCaseFeedBackIcon.svelte';
	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	let problem = $state(data.Problem?.[0] ?? {});
	let innerWidth: number = $state(0); //gets the width of the page
	let toggleConsole: boolean = $state(false); //toggles the console
	let offset = $state(0); //offset state, determines how much more pixels should be taken by the right panel.
	let consoleContent = $state([]); //console content
	let unreadConsole = $state(false); //unread console content flag

	let leftWidth = $derived(innerWidth / 2 + offset);
	let rightWidth = $derived(innerWidth - leftWidth);
	let problemBody = $state(undefined);
	let value = $state('');
	let handleReset: () => void = $state(() => {});
	let readProblem = $state(true);

	let toggleTestResults = $state(false);
	let test_passed = $state([]);
	let test_failed = $state([]);
	let test_failed_count = $derived(test_failed.length);
	let test_passed_count = $derived(test_passed.length);
	let isPassed = $state(-1); //flag for the test case

	//this function sends a post request to the api.
	const handleSubmit = async () => {
		let toSubmit = problem.test_function + '\n' + value;
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
		test_failed = data.run.test_failed;
		test_passed = data.run.test_passed;

		if (data.run.test_failed.length == 0) {
			isPassed = 0;
		} else {
			isPassed = 1;
		}

		if (toggleConsole == false) {
			unreadConsole = true;
		}
	};

	//start resize, called when the mouse is held down on the resize bar. assigns a listener on mousemove which modifies the offset state.
	const startResize = (e: MouseEvent) => {
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

	$effect(() => {
		problemBody = problem.body;
		value = problem.starter_code;
	});

	const updateSessionHistory = async () => {
		let oldHistory = [];
		if (data.Problem[0]?.Session.length > 0) {
			oldHistory = data.Problem[0].Session[0].history;
		}
		let history = localStorage.getItem(problem.id);

		// Only proceed if there's history in localStorage
		if (history) {
			history = JSON.parse(history);
			let combinedHistory = [...oldHistory, ...(history || [])];

			// Check if the history has actually changed
			let lastKnownHistory = localStorage.getItem(`lastKnown_${problem.id}`);
			if (!lastKnownHistory || lastKnownHistory !== JSON.stringify(combinedHistory)) {
				let body = {
					id: problem.id,
					history: combinedHistory,
					last_state: value,
					student_email: data.user.email
				};

				const res = await fetch('/api/updateHistory', {
					method: 'POST',
					body: JSON.stringify(body)
				});
				if (res.ok) {
					// Store the current history as last known
					localStorage.setItem(`lastKnown_${problem.id}`, JSON.stringify(combinedHistory));
				} else {
					console.log('History Update Failed');
				}
			}
		}
	};

	let interval: string | number | NodeJS.Timeout | undefined;

	// Set up the interval when the component is mounted
	onMount(() => {
		localStorage.clear();
		interval = setInterval(updateSessionHistory, 15000); // Run every 15 seconds
	});

	// Clean up the interval when the component is destroyed
	onDestroy(() => {
		clearInterval(interval);
	});
</script>

<svelte:window onmouseup={abortResize} bind:innerWidth />
{#if problemBody}
	<!--Use grow class on your divs if you want no scroll bar, otherwise the content will just overflow all good-->
	<div class="flex justify-start grow overflow-auto relative">
		<div
			class={readProblem
				? 'pl-5 pt-5 pr-3 pb-10 overflow-auto w-full'
				: 'pl-5 pt-5 pr-3 pb-10 overflow-auto w-full hidden md:block'}
			style={leftWidth >= 384 ? `width : ${leftWidth}px` : ''}
		>
			<div
				class="prose prose-headings:text-white prose-p:text-white prose-a:text-blue-500 prose-code:text-white prose-code:bg-gray-700 prose-code:rounded prose-code:px-1 prose-code:font-normal"
			>
				{@html marked(problemBody)}
			</div>
		</div>

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="w-2 cursor-col-resize justify-center items-center bg-black/30 hidden md:flex"
			id="divider"
			onmousedown={startResize}
		>
			<button class="w-full" title="reset sizing" onclick={resetResize}> | </button>
		</div>

		<div
			class={readProblem ? 'hidden md:flex flex-col' : 'flex flex-col w-full'}
			style={rightWidth >= 384 ? `width : ${rightWidth}px` : ''}
		>
			<span class="flex items-end justify-between gap-3 px-3 max-h-fit w-full pt-1 pb-2 grow">
				<div></div>

				<div class="flex gap-2">
					<TestCaseFeedBackIcon
						bind:toggleTestResults
						{test_failed_count}
						{test_passed_count}
						{isPassed}
					/>
					<button class="btn" onclick={handleReset}> Reset Code </button>
					<button class="btn bg-[#006239] text-white hover:bg-[#004327]" onclick={handleSubmit}>
						Run
					</button>
				</div>
			</span>

			<CodeEditor bind:value bind:problem bind:handleReset />

			<TestCaseDisplay bind:toggleTestResults {test_passed} {test_failed} />

			<Console bind:toggleConsole {consoleContent} bind:unreadConsole />
		</div>
	</div>
	<div class="grid md:hidden place-items-center h-10">
		<div class="flex flex-row gap-2 pb-3 pt-3">
			<p class={readProblem ? 'text-sm text-gray-500' : 'text-sm text-white'}>Show code</p>
			<input type="checkbox" class="toggle toggle-md" bind:checked={readProblem} />
			<p class={readProblem ? 'text-sm text-white' : 'text-sm text-gray-500'}>Show problem</p>
		</div>
	</div>
{/if}
