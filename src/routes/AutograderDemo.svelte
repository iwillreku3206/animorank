<script lang="ts">
  import { fade } from 'svelte/transition';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import { coursePrograms } from './coursePrograms';

  let {
    selected,
    onselect
  }: {
    selected: string;
    onselect: (_code: string) => void;
  } = $props();

  // Tab list for the demo. Codes are the keys into coursePrograms.
  // TEMPORARY: CCPROG1 topics, mirroring ./heroGraphNodes.
  const courses = [
    { code: 'Variables', name: 'Variables, operators and expressions' },
    { code: 'I/O', name: 'Input and output' },
    { code: 'Functions', name: 'User-defined functions' },
    { code: 'Conditionals', name: 'Conditional constructs' },
    { code: 'Loops', name: 'Iterative constructs' }
  ];

  /* --- OLD course tabs (kept for restore) ---
  const courses = [
    { code: 'CCPROG1', name: 'Logic Formulation and Introductory Programming' },
    { code: 'CCPROG2', name: 'Programming with Structured Data Types' },
    { code: 'CCPROG3', name: 'Object-Oriented Design and Programming' },
    { code: 'CSALGCM', name: 'Algorithms and Complexity' },
    { code: 'CSINTSY', name: 'Introduction to Intelligent Systems' }
  ];
  --- end OLD course tabs --- */

  const program = $derived(coursePrograms[selected]);

  function tokClass(t: string) {
    if (t === 'k') return 'text-accent';
    if (t === 'f') return 'text-primary';
    if (t === 'v') return 'text-base-content';
    if (t === 'n') return 'text-info';
    return 'text-base-content/55';
  }

  type Phase = 'idle' | 'running' | 'tested' | 'submitted';
  let phase = $state<Phase>('idle');
  let passed = $state(0);
  let timers: ReturnType<typeof setTimeout>[] = [];

  // Auto-advance: cycle the active tab to the next course every 5s as a hands-off
  // showcase. The moment the user clicks any tab we stop for good — the demo is
  // theirs to drive from then on. The progress bar under the active tab is keyed
  // to `selected` so its CSS fill animation restarts on every switch.
  const ADVANCE_MS = 5000;
  let autoAdvance = $state(true);
  let advanceTimer: ReturnType<typeof setInterval> | undefined;

  function stopAutoAdvance() {
    autoAdvance = false;
    if (advanceTimer) {
      clearInterval(advanceTimer);
      advanceTimer = undefined;
    }
  }

  $effect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!autoAdvance || reduce || courses.length < 2) return;
    advanceTimer = setInterval(() => {
      const i = courses.findIndex((c) => c.code === selected);
      const next = courses[(i + 1) % courses.length];
      onselect(next.code);
    }, ADVANCE_MS);
    return () => clearInterval(advanceTimer);
  });

  // Click handler for the tabs: stop auto-advancing, then select.
  function pickTab(code: string) {
    stopAutoAdvance();
    onselect(code);
  }

  let statusText = $derived(
    phase === 'submitted'
      ? 'Submitted'
      : phase === 'tested'
        ? 'All tests passed'
        : phase === 'running'
          ? 'Running…'
          : 'Ready'
  );
  let statusColor = $derived(
    phase === 'tested' || phase === 'submitted'
      ? 'text-success'
      : phase === 'running'
        ? 'text-warning'
        : 'text-base-content/55'
  );
  let busy = $derived(phase === 'running');

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function grade(target: 'tested' | 'submitted') {
    clearTimers();
    const count = program.cases.length;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      passed = count;
      phase = target;
      return;
    }
    phase = 'running';
    passed = 0;
    for (let i = 0; i < count; i++) {
      timers.push(setTimeout(() => (passed = i + 1), 320 + i * 120));
    }
    timers.push(setTimeout(() => (phase = target), 320 + count * 120 + 260));
  }

  function run() {
    grade('tested');
  }

  function submit() {
    if (phase === 'tested') phase = 'submitted';
    else if (phase !== 'running') grade('submitted');
  }

  // Reset to an un-run state whenever the selected problem changes. Reading
  // `selected` in the condition registers it as the dependency.
  $effect(() => {
    if (selected) {
      clearTimers();
      phase = 'idle';
      passed = 0;
    }
    return clearTimers;
  });
</script>

{#snippet checkIcon(cls: string)}
  <svg
    class={cls}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
{/snippet}

<div
  class="ide flex h-120 flex-col overflow-hidden rounded-xl border border-white/12 bg-base-200 shadow-2xl shadow-black/50 lg:h-136"
>
  <!-- title bar -->
  <div class="flex shrink-0 items-center gap-3 border-b border-white/8 bg-base-300/70 px-4 py-2.5">
    <span
      class="flex gap-1.5"
      aria-hidden="true"
    >
      <span class="h-3 w-3 rounded-full bg-[#ff5f57]/90"></span>
      <span class="h-3 w-3 rounded-full bg-[#febc2e]/90"></span>
      <span class="h-3 w-3 rounded-full bg-[#28c840]/90"></span>
    </span>
    <div class="ml-auto flex items-center gap-2">
      <Button
        class="btn-xs gap-1.5 {busy ? 'btn-active' : ''}"
        onclick={run}
        disabled={busy}
      >
        {#if busy}
          <span class="loading loading-spinner loading-xs"></span>
        {:else}
          <svg
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        {/if}
        Run
      </Button>
      <Button
        class="btn-primary btn-xs font-semibold"
        onclick={submit}
        disabled={busy}
      >
        Submit
      </Button>
    </div>
  </div>

  <!-- tabs = course picker (horizontal scroll on narrow screens so no tab is
       clipped out of reach) -->
  <div
    class="flex shrink-0 overflow-x-auto border-b border-white/8 bg-base-300/40"
    role="tablist"
    aria-label="Choose a course"
  >
    {#each courses as course (course.code)}
      {@const active = course.code === selected}
      {@const tabExt = coursePrograms[course.code].filename.split('.').pop()}
      <button
        role="tab"
        aria-selected={active}
        onclick={() => pickTab(course.code)}
        class="relative flex items-center gap-1.5 border-r border-white/8 px-3.5 py-2 font-mono text-xs whitespace-nowrap transition {active
          ? 'bg-base-200 text-base-content'
          : 'text-base-content/45 hover:bg-base-200/50 hover:text-base-content/70'}"
      >
        {course.code}<span class="text-base-content/35">.{tabExt}</span>
        {#if active && autoAdvance}
          <!-- countdown to the next auto-switch; `selected` key restarts the fill -->
          {#key selected}
            <span
              class="advance-bar"
              style="--advance:{ADVANCE_MS}ms"
              aria-hidden="true"
            ></span>
          {/key}
        {/if}
      </button>
    {/each}
  </div>

  <!-- body: spec | (code / results) -->
  <div class="flex min-h-0 flex-1">
    <!-- spec pane (rendered problem) -->
    <div class="ide-pane hidden w-[34%] shrink-0 flex-col border-r border-white/8 lg:flex">
      <div
        class="shrink-0 px-4 pt-3 pb-2 text-[11px] font-medium tracking-wide text-base-content/45 uppercase"
      >
        Problem
      </div>
      <div class="relative min-h-0 flex-1 overflow-hidden px-4 pb-4">
        <!-- <p class="font-mono text-[11px] text-base-content/45">{selected} · {courseName}</p> -->
        <h3 class="mt-1 font-display text-base font-bold tracking-tight text-base-content">
          {program.title}
        </h3>
        <p class="mt-2 text-[13px] leading-relaxed text-base-content/75">{program.statement}</p>

        <div
          class="mt-3 rounded-lg border border-white/8 bg-base-300/50 p-2.5 font-mono text-[11px] leading-relaxed"
        >
          {#each program.examples as ex (ex.input)}
            <div class="text-base-content/55">
              <span class="text-base-content/40">in&nbsp;&nbsp;</span>{ex.input}
            </div>
            <div class="text-primary">
              <span class="text-base-content/40">out&nbsp;</span>{ex.output}
            </div>
          {/each}
        </div>

        {#if program.note}
          <p class="mt-3 font-mono text-[11px] text-base-content/45">{program.note}</p>
        {/if}
        <div class="clip-fade tint-200"></div>
      </div>
    </div>

    <!-- right: code over results -->
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- code -->
      <div class="ide-pane relative min-h-0 flex-1 overflow-hidden">
        <div class="h-full overflow-hidden px-4 py-3 font-mono text-[13px] leading-6">
          {#each program.code as line, i (i)}
            <div class="flex">
              <span class="w-7 shrink-0 pr-3 text-right text-base-content/30 tabular-nums">
                {i + 1}
              </span>
              <span class="whitespace-pre">
                {#each line as [t, text], j (j)}<span class={tokClass(t)}>{text}</span>{/each}
              </span>
            </div>
          {/each}
        </div>
        <div class="clip-fade tint-200"></div>
      </div>

      <!-- results / output -->
      <div class="ide-pane flex h-42 shrink-0 flex-col border-t border-white/8 bg-base-300/30">
        <div class="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-2">
          <span class="text-[11px] font-medium tracking-wide text-base-content/55 uppercase">
            Tests
          </span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px] tabular-nums text-base-content/45">
              {passed}/{program.cases.length}
            </span>
            <span class="text-xs font-medium {statusColor}">{statusText}</span>
          </div>
        </div>

        <div class="relative min-h-0 flex-1 overflow-hidden px-2 py-1.5">
          {#if phase === 'idle'}
            <div class="flex h-full items-center justify-center gap-2 text-center">
              <span class="text-[13px] text-base-content/55">
                Press
                <span class="font-medium text-base-content/80">Run</span>
                to grade ·
                {program.cases.length} hidden cases
              </span>
            </div>
          {:else if phase === 'submitted'}
            <div
              in:fade={{ duration: 250 }}
              class="flex h-full flex-col items-center justify-center gap-1 text-center"
            >
              <span class="flex items-center gap-2 font-display text-sm font-bold text-success">
                {@render checkIcon('h-4 w-4')}
                Solution submitted
              </span>
              <span class="text-[12px] text-base-content/60">
                {program.cases.length}/{program.cases.length} passed · saved to your progress
              </span>
            </div>
          {:else}
            <ul class="flex flex-col">
              {#each program.cases as label, i (i)}
                {@const isPassed = i < passed}
                {@const isRunning = phase === 'running' && i === passed}
                <li
                  class="flex items-center gap-2 rounded px-2 py-1 text-[13px] transition-colors duration-300 {isPassed
                    ? 'text-primary'
                    : isRunning
                      ? 'text-base-content/80'
                      : 'text-base-content/45'}"
                >
                  {#if isPassed}
                    <span
                      class="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-primary/20"
                    >
                      {@render checkIcon('h-2 w-2')}
                    </span>
                  {:else if isRunning}
                    <span class="loading loading-spinner loading-xs shrink-0"></span>
                  {:else}
                    <span class="grid h-3.5 w-3.5 shrink-0 place-items-center">
                      <span class="h-1.5 w-1.5 rounded-full bg-current opacity-50"></span>
                    </span>
                  {/if}
                  <span class="font-mono text-[11px]">Case {i + 1}</span>
                  <span class="truncate text-[11px] text-base-content/50">{label}</span>
                  <span class="ml-auto text-[11px] font-medium">
                    {isPassed ? 'Passed' : isRunning ? 'Running' : 'Pending'}
                  </span>
                </li>
              {/each}
            </ul>
            <div class="clip-fade tint-300"></div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Bottom fade so clipped content reads as if it scrolls (it doesn't). */
  .clip-fade {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    height: 2.25rem;
    pointer-events: none;
  }
  .clip-fade.tint-200 {
    background: linear-gradient(to top, var(--color-base-200), transparent);
  }
  .clip-fade.tint-300 {
    background: linear-gradient(to top, var(--color-base-300), transparent);
  }

  /* Countdown indicator under the active tab: fills left-to-right over the
     auto-advance window, then the tab switches. Honors reduced-motion. */
  .advance-bar {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    height: 2px;
    transform-origin: left;
    background: var(--color-primary);
    animation: advance-fill var(--advance) linear forwards;
  }
  @keyframes advance-fill {
    from {
      transform: scaleX(0);
    }
    to {
      transform: scaleX(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .advance-bar {
      animation: none;
      display: none;
    }
  }
</style>
