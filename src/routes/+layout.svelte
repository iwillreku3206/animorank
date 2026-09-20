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

  const SOLVE_ROUTE = '/problem/[problem_id]/[session_id]';

  /**
   * Routes that fill the viewport themselves, so a footer below them would
   * either be unreachable or fight the page's own scroll container.
   *
   * Matched on route id rather than a pathname prefix: `/problem` as a prefix
   * also swallowed `/problemSets`, which stripped the footer off the problem
   * set catalogue and detail pages.
   */
  const FULL_BLEED_ROUTES = new Set([SOLVE_ROUTE, '/edit/[slug]']);
</script>

<div class="flex flex-col min-h-screen bg-base-300 text-base-content">
  {#if page.route.id !== SOLVE_ROUTE}
    <Navbar user={data.user} />
  {/if}

  <div class="flex flex-col flex-1">
    {@render children?.()}
  </div>

  {#if !FULL_BLEED_ROUTES.has(page.route.id ?? '')}
    <Footer />
  {/if}
</div>
