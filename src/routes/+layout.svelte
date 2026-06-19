<script lang="ts">
  import '../app.css';
  import 'katex/dist/katex.min.css';
  import '@gravity-ui/uikit/styles/fonts.css';
  import '@gravity-ui/uikit/styles/styles.css';
  import '@diplodoc/transform/dist/css/yfm.css';
  import 'dockview-core/dist/styles/dockview.css';

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

<div class="md:flex flex-col min-h-screen bg-base-300 text-white hidden">
  <Navbar user={data.user} />

  <div class="flex flex-col flex-1">
    {@render children?.()}
  </div>

  {#if !page.url.pathname.startsWith('/edit') && !page.url.pathname.startsWith('/problem')}
    <Footer />
  {/if}
</div>

<div class="flex flex-row justify-center items-center md:hidden w-full text-center h-screen">
  AnimoRank is not yet supported on mobile. If you are on desktop, kindly increase the size of the
  AnimoRank tab.
</div>
