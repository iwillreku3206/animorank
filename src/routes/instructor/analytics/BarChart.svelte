<script
  module
  lang="ts"
>
  // Selective registration: `Bar` registers `BarController` itself, and the
  // legend is disabled, so neither is imported here.
  import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
  ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);
</script>

<script lang="ts">
  import { Bar } from 'svelte-chartjs';
  import type { ChartData, ChartOptions } from 'chart.js';

  interface Props {
    title: string;
    points: { day: string; value: number }[];
  }

  let { title, points }: Props = $props();

  const max = $derived(Math.max(0, ...points.map((p) => p.value)));

  // UTC on both sides so the server-rendered labels match the hydrated ones.
  const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const formatDay = (day: string) => dayFormat.format(new Date(`${day}T00:00:00Z`));

  const chartData: ChartData<'bar', number[], string> = $derived({
    labels: points.map((p) => formatDay(p.day)),
    datasets: [
      {
        label: title,
        data: points.map((p) => p.value),
        backgroundColor: 'rgba(119, 222, 61, 0.75)',
        hoverBackgroundColor: '#77de3d',
        borderRadius: 2
      }
    ]
  });

  // Chart.js paints to a canvas and cannot resolve CSS custom properties, so
  // the theme colors of `animorank-dark` are spelled out: `--color-primary`
  // (#77de3d) for the bars and `--color-base-content` (≈#ececec) for ticks and
  // grid lines.
  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'nearest', intersect: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(236, 236, 236, 0.6)', autoSkip: true, maxTicksLimit: 8 }
      },
      y: {
        beginAtZero: true,
        ticks: { color: 'rgba(236, 236, 236, 0.6)', precision: 0 },
        grid: { color: 'rgba(236, 236, 236, 0.08)' }
      }
    }
  };
</script>

<figure class="card rounded-box bg-base-200 p-5">
  <figcaption class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
    <h2 class="font-display text-lg font-semibold">{title}</h2>
    <span class="text-xs text-base-content/60">{points.length} days · max {max}</span>
  </figcaption>
  {#if points.length === 0 || max === 0}
    <p class="py-12 text-center text-base-content/60">No data in this range.</p>
  {:else}
    <div class="h-64">
      <Bar
        data={chartData}
        options={chartOptions}
        role="img"
        aria-label={title}
      />
    </div>
  {/if}
</figure>
