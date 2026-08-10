<script lang="ts">
  import '../app.css';
  import '../yfm.css';
  import 'katex/dist/katex.min.css';
  import '@gravity-ui/uikit/styles/fonts.css';
  import '@gravity-ui/uikit/styles/styles.css';
  import '@diplodoc/transform/dist/css/yfm.css';
  import 'dockview-core/dist/styles/dockview.css';
  import '$lib/window/animorank-theme.css';

  import Footer from '$lib/components/layout/Footer.svelte';
  import Navbar from '$lib/components/layout/Navbar.svelte';
  import type { LayoutServerData } from './$types';
  import { page } from '$app/state';

  interface Props {
    data: LayoutServerData;
    children?: import('svelte').Snippet;
  }

  let { data, children }: Props = $props();
</script>

<div class="flex flex-col min-h-screen bg-base-300 text-base-content">
  <Navbar user={data.user} />

  <div class="flex flex-col flex-1">
    {@render children?.()}
  </div>

  {#if !page.url.pathname.startsWith('/edit') && !page.url.pathname.startsWith('/problem')}
    <Footer />
  {/if}
</div>
