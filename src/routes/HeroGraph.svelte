<!--
  Interactive hero backdrop: a dotted grid hosting a loose web of course and
  topic nodes. Medium nodes are courses, small nodes are topics. Hovering a
  node reveals its label; clicking a node branches out to its related nodes
  (single focus — opening one collapses the previously opened cluster). At
  rest the nodes "breathe" softly. Purely decorative/exploratory: no navigation
  and hidden from assistive tech. All motion is disabled under
  prefers-reduced-motion.

  Positions are generated once from a fixed seed so the server and client
  render identical markup (clean hydration).
-->
<script
  lang="ts"
  module
>
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';

  // ---- data: topics, subtopics, and their relations (see ./heroGraphNodes) ----
  import { TOPICS, RELATIONS, TOPIC_ANCHORS } from './heroGraphNodes';

  // flattened, de-duped list of subtopics (small nodes)
  const SUBTOPICS = Array.from(new Set(Object.values(RELATIONS).flat()));

  // adjacency both ways: topic <-> subtopic
  const ADJ = new SvelteMap<string, SvelteSet<string>>();
  const link = (a: string, b: string) => {
    (ADJ.get(a) ?? ADJ.set(a, new SvelteSet()).get(a)!).add(b);
    (ADJ.get(b) ?? ADJ.set(b, new SvelteSet()).get(b)!).add(a);
  };
  for (const [topic, subtopics] of Object.entries(RELATIONS)) {
    for (const s of subtopics) link(topic, s);
  }

  type Kind = 'course' | 'topic';
  type Node = { id: string; label: string; kind: Kind; x: number; y: number };

  // ---- deterministic layout (percent coordinates) ---------------------------
  function mulberry32(seed: number) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Bottom-left is reserved for the headline/CTA, so nodes steer clear of it.
  const inTextZone = (x: number, y: number) => x < 44 && y > 56;
  const tooClose = (x: number, y: number, placed: Node[], min: number) =>
    placed.some((n) => Math.hypot(n.x - x, n.y - y) < min);

  function buildNodes(): Node[] {
    const rng = mulberry32(0x5eed);
    const placed: Node[] = [];

    // Topics get spread anchors so the web has a good skeleton, then jitter.
    for (const c of TOPICS) {
      const [ax, ay] = TOPIC_ANCHORS[c.id];
      placed.push({
        id: c.id,
        label: c.id,
        kind: 'course',
        x: ax + (rng() - 0.5) * 6,
        y: ay + (rng() - 0.5) * 6
      });
    }

    // Subtopics scatter by rejection sampling, avoiding the text zone and overlaps.
    for (const s of SUBTOPICS) {
      let x = 50;
      let y = 50;
      for (let i = 0; i < 200; i++) {
        x = 8 + rng() * 84;
        y = 6 + rng() * 86;
        if (inTextZone(x, y)) continue;
        if (tooClose(x, y, placed, 9)) continue;
        break;
      }
      placed.push({ id: s, label: s, kind: 'topic', x, y });
    }
    return placed;
  }

  const NODES = buildNodes();

  // unique edges (course -> topic)
  const EDGES = Object.entries(RELATIONS).flatMap(([course, topics]) => topics.map((t) => ({ a: course, b: t })));
</script>

<script lang="ts">
  import { onMount } from 'svelte';

  let container: HTMLElement;

  // Positions are reactive so nodes can be dragged; edges read live from here.
  let nodes = $state(NODES.map((n) => ({ ...n })));
  const posMap = $derived(new Map(nodes.map((n) => [n.id, n])));

  // Focus follows the hovered (or dragged) node.
  let activeId = $state<string | null>(null);
  const related = $derived(activeId ? (ADJ.get(activeId) ?? new Set<string>()) : new Set<string>());

  // ---- discovery cue ------------------------------------------------------
  const CYCLE = Object.keys(RELATIONS);
  let hintId = $state<string | null>(null);
  let engaged = false;
  let cycleIndex = 0;
  let cycleTimer: ReturnType<typeof setTimeout> | undefined;

  function focusNext() {
    if (engaged) return;
    const id = CYCLE[cycleIndex % CYCLE.length];
    cycleIndex++;
    hintId = id; // a double-ping ring fires on this initial focus
    activeId = id;
    cycleTimer = setTimeout(() => {
      if (engaged) return;
      hintId = null;
      if (activeId === id) activeId = null;
      cycleTimer = setTimeout(focusNext, 3000); // 3s at rest, then next course
    }, 3000); // hold focus 3s
  }

  // First hover on a course (or any drag) cancels the cue for good.
  function engage() {
    if (engaged) return;
    engaged = true;
    clearTimeout(cycleTimer);
    hintId = null;
  }

  onMount(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    cycleTimer = setTimeout(focusNext, 2500);
    return () => clearTimeout(cycleTimer);
  });

  function nodeState(id: string): 'active' | 'related' | 'dim' | 'idle' {
    if (!activeId) return 'idle';
    if (id === activeId) return 'active';
    if (related.has(id)) return 'related';
    return 'dim';
  }

  function edgeActive(a: string, b: string) {
    return activeId !== null && (a === activeId || b === activeId);
  }

  // Topic labels are forced visible for the active/related cluster; otherwise
  // they reveal on hover (handled in CSS).
  function labelForced(id: string) {
    const s = nodeState(id);
    return s === 'active' || s === 'related';
  }

  // ---- drag (pointer capture; works for mouse and touch) ------------------
  let dragId = $state<string | null>(null);
  let startX = 0;
  let startY = 0;
  let origX = 0;
  let origY = 0;

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  function dragStart(e: PointerEvent, n: { id: string; x: number; y: number }) {
    engage();
    dragId = n.id;
    activeId = n.id;
    startX = e.clientX;
    startY = e.clientY;
    origX = n.x;
    origY = n.y;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function dragMove(e: PointerEvent) {
    if (dragId === null || !container) return;
    const rect = container.getBoundingClientRect();
    const dx = ((e.clientX - startX) / rect.width) * 100;
    const dy = ((e.clientY - startY) / rect.height) * 100;
    const node = nodes.find((nn) => nn.id === dragId);
    if (node) {
      node.x = clamp(origX + dx, 2, 98);
      node.y = clamp(origY + dy, 2, 98);
    }
  }

  function dragEnd(e: PointerEvent) {
    if (dragId === null) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    dragId = null;
  }
</script>

<div
  bind:this={container}
  class="graph absolute inset-0 overflow-hidden"
  aria-hidden="true"
>
  <!-- dotted grid, faded toward the edges -->
  <div class="dots absolute inset-0"></div>

  <!-- edges -->
  <svg
    class="pointer-events-none absolute inset-0 h-full w-full"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
  >
    {#each EDGES as e (e.a + '|' + e.b)}
      {@const na = posMap.get(e.a)}
      {@const nb = posMap.get(e.b)}
      {#if na && nb}
        <line
          class="edge"
          class:on={edgeActive(e.a, e.b)}
          x1={na.x}
          y1={na.y}
          x2={nb.x}
          y2={nb.y}
          vector-effect="non-scaling-stroke"
        />
      {/if}
    {/each}
  </svg>

  <!-- nodes: hover to focus, drag to reposition -->
  {#each nodes as n, i (n.id)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="node {n.kind} {nodeState(n.id)}"
      class:show-label={labelForced(n.id)}
      class:dragging={dragId === n.id}
      class:hint={hintId === n.id}
      style="left:{n.x}%; top:{n.y}%; --i:{i};"
      onpointerdown={(e) => dragStart(e, n)}
      onpointermove={dragMove}
      onpointerup={dragEnd}
      onpointercancel={dragEnd}
      onpointerenter={() => {
        if (n.kind === 'course') engage();
        activeId = n.id;
      }}
      onpointerleave={() => {
        if (dragId === null) activeId = null;
      }}
    >
      {#if n.kind === 'course'}
        <span class="badge-node">{n.label}</span>
      {:else}
        <span class="dot"></span>
        <span
          class="label"
          class:flip={n.x > 64}>{n.label}</span
        >
      {/if}
    </div>
  {/each}
</div>

<style>
  .graph {
    --line: color-mix(in oklch, var(--color-base-content) 8%, transparent);
    --dot: color-mix(in oklch, var(--color-base-content) 12%, transparent);
    z-index: 0;
  }

  /* ---- dotted grid -------------------------------------------------------- */
  .dots {
    background-image: radial-gradient(var(--dot) 1.1px, transparent 1.2px);
    background-size: 30px 30px;
    background-position: center;
    -webkit-mask-image: radial-gradient(115% 95% at 55% 40%, black 45%, transparent 85%);
    mask-image: radial-gradient(115% 95% at 55% 40%, black 45%, transparent 85%);
  }

  /* ---- edges -------------------------------------------------------------- */
  .edge {
    stroke: color-mix(in oklch, var(--color-primary) 30%, transparent);
    stroke-width: 1;
    opacity: 0;
    transition:
      opacity 0.45s ease,
      stroke 0.45s ease;
  }
  .edge.on {
    opacity: 0.7;
    stroke: color-mix(in oklch, var(--color-primary) 55%, transparent);
  }

  /* ---- nodes -------------------------------------------------------------- */
  .node {
    position: absolute;
    transform: translate(-50%, -50%);
    transition: opacity 0.4s ease;
  }
  .node.dragging {
    z-index: 5;
  }

  /* discovery cue: a soft ring that pings twice over the guided-reveal node,
     then is removed. Sits behind the badge/dot so it reads as a halo. */
  .node.hint {
    z-index: 4;
  }
  .node.hint::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 18px;
    height: 18px;
    border-radius: 999px;
    transform: translate(-50%, -50%);
    border: 1.5px solid color-mix(in oklch, var(--color-primary) 60%, transparent);
    pointer-events: none;
    animation: hint-ping 1.5s cubic-bezier(0.22, 0.61, 0.36, 1) 2;
  }

  @keyframes hint-ping {
    0% {
      opacity: 0.7;
      transform: translate(-50%, -50%) scale(0.5);
    }
    70% {
      opacity: 0;
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(3.2);
    }
  }

  /* course: a neutral, always-visible code badge (also the drag handle) */
  .badge-node {
    display: block;
    white-space: nowrap;
    border-radius: 7px;
    border: 1px solid color-mix(in oklch, var(--color-base-content) 14%, transparent);
    background: color-mix(in oklch, var(--color-base-100) 92%, transparent);
    padding: 3px 9px;
    font-size: 12px;
    line-height: 1.4;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: var(--color-base-content);
    box-shadow: 0 1px 2px color-mix(in oklch, black 22%, transparent);
    cursor: grab;
    user-select: none;
    touch-action: none;
    transition:
      border-color 0.35s ease,
      color 0.35s ease,
      background-color 0.35s ease,
      transform 0.35s cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  /* topic: a small dot with an enlarged invisible hit area */
  .dot {
    display: block;
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: color-mix(in oklch, var(--color-base-content) 38%, transparent);
    position: relative;
    cursor: grab;
    touch-action: none;
    /* gentle, staggered "breathing" at rest */
    animation: breathe 5.5s ease-in-out infinite;
    animation-delay: calc(var(--i) * -0.37s);
    transition:
      transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1),
      background-color 0.4s ease;
  }
  .dot::before {
    content: '';
    position: absolute;
    inset: -9px;
    border-radius: 999px;
  }

  /* focus states */
  .node.dim {
    opacity: 0.25;
  }
  .node.active .badge-node,
  .node.related .badge-node {
    border-color: color-mix(in oklch, var(--color-primary) 55%, transparent);
    color: var(--color-primary);
  }
  .node.active .badge-node {
    transform: scale(1.07);
  }
  .node.related .dot {
    background: color-mix(in oklch, var(--color-primary) 75%, transparent);
    transform: scale(1.25);
  }
  .node.active .dot,
  .node .dot:hover {
    transform: scale(1.3);
  }
  .node.active.topic .dot {
    background: color-mix(in oklch, var(--color-primary) 85%, transparent);
  }

  /* dragging: grabbing cursor + freeze the grabbed node's breathing */
  .node.dragging .dot,
  .node.dragging .badge-node {
    cursor: grabbing;
  }
  .node.dragging .dot {
    animation: none;
  }

  /* ---- labels (hover / forced) ------------------------------------------- */
  .label {
    position: absolute;
    bottom: calc(100% + 7px);
    left: 50%;
    transform: translate(-50%, 4px);
    white-space: nowrap;
    border-radius: 7px;
    border: 1px solid color-mix(in oklch, var(--color-base-content) 10%, transparent);
    background: color-mix(in oklch, var(--color-base-100) 90%, transparent);
    padding: 2px 8px;
    font-size: 11px;
    line-height: 1.4;
    font-weight: 500;
    color: var(--color-base-content);
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 0.25s ease,
      transform 0.25s ease;
  }
  /* keep right-edge labels from spilling off-canvas */
  .label.flip {
    left: auto;
    right: 50%;
    transform: translate(50%, 4px);
  }
  .node .dot:hover + .label,
  .node.show-label .label {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  .node.show-label .label.flip,
  .node .dot:hover + .label.flip {
    transform: translate(50%, 0);
  }

  @keyframes breathe {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.85;
    }
    50% {
      transform: scale(1.12);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .node .dot {
      animation: none;
    }
    .node.hint::after {
      animation: none;
      display: none;
    }
  }
</style>
