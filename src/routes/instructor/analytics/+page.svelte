<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import type { PageProps } from './$types';
  import BarChart from './BarChart.svelte';
  import Select from '$lib/components/ui/selects/Select.svelte';
  import Seo from '$lib/components/layout/Seo.svelte';

  let { data }: PageProps = $props();

  // The range lives in the URL so a view is linkable and survives reloads; the
  // load function is the only reader of it.
  function setRange(value: string) {
    goto(`${page.url.pathname}?range=${value}`, { keepFocus: true, noScroll: true, replaceState: true });
  }
</script>

<Seo
  title="Analytics"
  noindex
/>

<div class="flex flex-col gap-6">
  <header class="flex flex-wrap items-center justify-between gap-4">
    <h1 class="font-display text-2xl font-bold">Analytics</h1>
    <Select
      id="analytics-range"
      class="select-bordered select-sm w-44"
      value={data.range}
      onchange={(e) => setRange(e.currentTarget.value)}
    >
      <option value="30">Last 30 days</option>
      <option value="90">Last 90 days</option>
      <option value="all">All time</option>
    </Select>
  </header>

  <div class="stats bg-base-200">
    <div class="stat">
      <div class="stat-title">Total users</div>
      <div class="stat-value">{data.totalUsers}</div>
      <div class="stat-desc">All accounts</div>
    </div>
  </div>

  <BarChart
    title="Sign-ups per day"
    points={data.signups}
  />
  <BarChart
    title="Cumulative users"
    points={data.cumulative}
  />
  <BarChart
    title="Practice sessions per day"
    points={data.sessions}
  />
</div>
