<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';

	let props: HTMLButtonAttributes = $props();

	let { class: className, children, ...rest } = $derived(props);
</script>

<button class="btn bg-primary text-primary-content px-4 py-3 {className}" {...rest}
	>{@render children?.()}</button
>
