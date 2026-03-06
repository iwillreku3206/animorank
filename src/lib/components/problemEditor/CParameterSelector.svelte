<script lang="ts">
	import type { CParameterType, CReturnType } from '$lib/types/testCaseInfo';
	import { typeToString } from '$lib/utils/typeToString';
	import { DropdownMenu } from 'bits-ui';

	let { type = $bindable() }: { type: CParameterType | CReturnType } = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="btn btn-sm">
		{typeToString(type)}
	</DropdownMenu.Trigger>
	<select name="" id=""></select>
</DropdownMenu.Root>
