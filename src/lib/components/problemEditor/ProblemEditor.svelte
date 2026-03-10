<script lang="ts">
	import type { Problem, ProblemTestCase, ProblemTestCaseType } from '../../../../zenstack/models';
	import Editor from '../Editor.svelte';
	import { Pane, Splitpanes } from 'svelte-splitpanes';
	import TestCase from './TestCase.svelte';
	import { createTestCase, deleteTestCase } from './api';
	import { DEFAULT_TEST_CASE } from '$lib/constants';
	import CodeEditor from '../CodeEditor.svelte';
	import { Popover } from 'bits-ui';
	import { untrack } from 'svelte';

	let {
		problem = $bindable(),
		testCases = $bindable()
	}: { problem: Problem; testCases: ProblemTestCase[] } = $props();

	let disableAddTestCase = $state(false);
	let disableDeleteTestCaseIndices = $state<Record<string, true | undefined>>({}); // hashmap for performance

	let problemSerialized = $derived(JSON.stringify(problem));
	let testCasesSerialized = $derived(JSON.stringify(testCases));

	let currentTimeout = $state<NodeJS.Timeout | undefined>(undefined);

	$effect(() => {
		// track these two objects
		problemSerialized;
		testCasesSerialized;
		// TODO: move autosaving a test case to the testcase card component
		clearTimeout(untrack(() => currentTimeout));
		currentTimeout = setTimeout(() => {
			console.log('saving');
		}, 3000);
	});

	function addTestCase(type: ProblemTestCaseType) {
		return async () => {
			disableAddTestCase = true;
			try {
				const id = await createTestCase(problem.id, type);
				if (id) {
					testCases.push({
						...DEFAULT_TEST_CASE,
						id,
						created_at: new Date(),
						updated_at: new Date(),
						problem_id: problem.id
					});
					testCases = testCases;
				}
			} catch (error) {
				console.error(error);
			} finally {
				disableAddTestCase = false;
			}
		};
	}

	function deleteTestCaseHandler(id: string) {
		return async () => {
			disableDeleteTestCaseIndices[id] = true;
			try {
				const success = await deleteTestCase(id);
				if (success) {
					testCases = testCases.filter((testCase) => testCase.id !== id);
				}
			} catch (error) {
				console.error(error);
			} finally {
				disableDeleteTestCaseIndices[id] = undefined;
			}
		};
	}
</script>

<div class="splitpanes-nobg h-full">
	{JSON.stringify({ currentTimeout })}
	<Splitpanes class="overflow-auto" style="height: calc(100vh - 4rem)">
		<Pane class="pl-5 pb-10 pt-5 pr-3 overflow-scroll h-full">
			<div class="w-9/10 m-auto">
				<h2 class="text-2xl mb-3">Problem Title</h2>
				<input
					type="text"
					class="input input-bordered w-full bg-inherit"
					placeholder="Problem Title"
					bind:value={problem.name}
				/>
			</div>

			<div class="w-9/10 m-auto mt-10">
				<h2 class="text-2xl mb-3">Edit Problem Description</h2>
				<div class="m-auto">
					<Editor bind:text={problem.description} />
				</div>
			</div>

			<div class="w-9/10 m-auto mt-10">
				<h2 class="text-2xl mb-3">Edit Starter Code</h2>
				<div class="m-auto">
					<CodeEditor class="min-h-[300px]" bind:code={problem.starter_code} language="c" />
				</div>
			</div>
		</Pane>
		<Pane class="pb-10 pt-5 pl-5 pr-3">
			<h2 class="text-2xl mb-6">Test Cases</h2>
			<div class="flex flex-col gap-4">
				{#each testCases as testCase, index}
					<TestCase
						bind:testCase={testCases[index]}
						order={index + 1}
						deleteDisabled={disableDeleteTestCaseIndices[testCase.id] === true}
						onDelete={deleteTestCaseHandler(testCase.id)}
					/>
				{/each}

				<Popover.Root>
					<Popover.Trigger class="btn btn-succcess">Add Test Case</Popover.Trigger>
					<Popover.Portal>
						<Popover.Overlay />
						<Popover.Content>
							<Popover.Close />
							<Popover.Arrow />
							<div class="bg-neutral-800 rounded-lg flex flex-col gap-2 p-4">
								<button
									onclick={addTestCase('FunctionOutputTestCase')}
									disabled={disableAddTestCase}
									class="btn btn-success btn-sm"
								>
									Function Output Test Case
								</button>
								<button
									onclick={addTestCase('ProgramIOTestCase')}
									disabled={disableAddTestCase}
									class="btn btn-success btn-sm"
								>
									Program I/O Test Case
								</button>
								<button
									onclick={addTestCase('CustomTestCase')}
									disabled={disableAddTestCase}
									class="btn btn-success btn-sm"
								>
									Custom Test Case
								</button>
							</div>
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>
			</div>
		</Pane>
	</Splitpanes>
</div>
