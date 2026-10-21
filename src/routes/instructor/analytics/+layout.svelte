<script lang="ts">
  import { page } from '$app/state';

  let { children }: { children?: import('svelte').Snippet } = $props();

  const links = [
    { href: '/instructor/analytics', label: 'Dashboard' },
    { href: '/instructor/analytics/session-logs', label: 'Session Logs' }
  ];
</script>

<div class="app-gutter mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-6 py-8 md:flex-row md:gap-8">
  <aside class="md:w-56 md:shrink-0">
    <ul class="menu menu-horizontal w-full flex-nowrap rounded-box bg-base-200 p-2 md:menu-vertical">
      {#each links as link (link.href)}
        <li>
          <a
            href={link.href}
            class:menu-active={page.url.pathname === link.href}
            aria-current={page.url.pathname === link.href ? 'page' : undefined}>{link.label}</a
          >
        </li>
      {/each}
    </ul>
  </aside>

  <div class="min-w-0 flex-1">
    {@render children?.()}
  </div>
</div>
