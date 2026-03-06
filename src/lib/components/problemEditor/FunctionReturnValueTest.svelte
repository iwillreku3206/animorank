<script lang="ts">
	import type { FunctionTestCaseInfo, TestCaseInfo } from '$lib/types/testCaseInfo';
	import type { ProblemTestCase } from '../../../../generated/prisma/client';
	import type { JsonObject } from '../../../../generated/prisma/internal/prismaNamespace';
	import CParameterSelector from './CParameterSelector.svelte';

	let { testCase = $bindable() }: { testCase: ProblemTestCase } = $props();

	$effect(() => {
		if (
			typeof testCase.test_case_info !== 'object' ||
			Object.keys(testCase.test_case_info as object).length === 0
		) {
			testCase.test_case_info = {
				type: 'FUNCTION_OUTPUT',
				functionName: '',
				returnType: { base: 'int' },
				parameters: []
			} satisfies FunctionTestCaseInfo;
		}
	});
</script>

{#if testCase.type == 'FUNCTION_OUTPUT' && (testCase.test_case_info as TestCaseInfo).type == 'FUNCTION_OUTPUT'}
	<CParameterSelector
		bind:type={(testCase.test_case_info as unknown as FunctionTestCaseInfo).returnType}
	/>
	<input type="text" pattern="[A-Za-z0-9_]*" />
{/if}
