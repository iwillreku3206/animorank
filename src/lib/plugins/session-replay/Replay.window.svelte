<script lang="ts">
  import Badge from '$lib/components/ui/badges/Badge.svelte';
  import Button from '$lib/components/ui/buttons/Button.svelte';
  import Select from '$lib/components/ui/selects/Select.svelte';
  import { colorOf, typeColors } from '$lib/analytics/sessionLogColors';
  import { formatLogTimestamp } from '$lib/analytics/sessionLogTime';
  import type { SessionLogsViewContext } from '../../../routes/instructor/analytics/session-logs/context.svelte';
  import { replayTexts, slotAt, textDeltas } from './replay';
  import {
    MAX_SPEED,
    MIN_SPEED,
    SPEEDS,
    TEXT_EDIT,
    buildTape,
    formatElapsed,
    frameDuration,
    parseSpeed,
    previewOf,
    textEditCounts,
    timelineSlices
  } from './tape';

  let { context }: { context: SessionLogsViewContext } = $props();

  // The service hands entries newest first; a recording runs oldest first.
  const entries = $derived([...context.logs].reverse());
  const frames = $derived(buildTape(entries));
  const lastPosition = $derived(Math.max(0, frames.length - 1));

  // The code side of the replay: the document rebuilt from the session's text
  // edits, and how many of them each frame has behind it.
  const document = $derived(context.document);
  const deltas = $derived(textDeltas(entries));
  const texts = $derived(replayTexts(document?.baseCode ?? '', deltas));
  const editsAt = $derived(textEditCounts(frames));
  // One colour per type of entry this session recorded, in first-appearance
  // order; the legend under the timeline is what names them.
  const colors = $derived(typeColors(entries));

  let rawPosition = $state(0);
  const position = $derived(Math.min(rawPosition, lastPosition));
  const frame = $derived(frames[position] ?? null);
  const editStep = $derived(editsAt[position] ?? 0);
  const code = $derived(texts[editStep] ?? '');
  const totalMs = $derived(frames.at(-1)?.elapsedMs ?? 0);
  const slices = $derived(timelineSlices(frames));
  const playheadPercent = $derived(
    slices[position] ? slices[position].startPercent + slices[position].widthPercent / 2 : 0
  );

  // The edit the code pane is showing, for the slot badge beside it.
  const slotLabel = $derived(
    editStep > 0 && document ? slotAt(document.slots, texts[editStep - 1], deltas[editStep - 1].offset) : null
  );
  // A reload mid-session re-seeds the editor, so the replayed code can end
  // somewhere other than the code the session saved; say so instead of hiding it.
  const diverged = $derived(
    position === lastPosition &&
      editStep === deltas.length &&
      document !== null &&
      texts[editStep] !== document.savedCode
  );

  // The multiplier playback uses, what the menu shows (a preset, or `custom`),
  // and the text in the custom field — kept apart so a half-typed value never
  // changes playback, and so switching to a preset and back keeps the number.
  let speed = $state(1);
  let speedChoice = $state<number | 'custom'>(1);
  let customText = $state('1');
  let playing = $state(false);
  let feed = $state<HTMLDivElement | null>(null);

  // A different selection is a different recording: rewind it.
  let tapeIdentity = $derived(
    `${frames.length}\u0000${frames[0]?.entry.id ?? ''}\u0000${frames.at(-1)?.entry.id ?? ''}`
  );
  let shownTape = '';
  $effect(() => {
    const identity = tapeIdentity;
    if (identity === shownTape) return;
    shownTape = identity;
    rawPosition = 0;
    playing = false;
  });

  $effect(() => {
    if (!playing) return;
    // One frame per tick, so changing the speed mid-playback restarts the tick.
    const id = setInterval(() => {
      if (position >= lastPosition) {
        playing = false;
        return;
      }
      rawPosition = position + 1;
    }, frameDuration(speed));
    return () => clearInterval(id);
  });

  // The feed follows the playhead, like a console following its own output.
  let shownPosition = '';
  $effect(() => {
    const key = `${position}:${frames.length}`;
    if (key === shownPosition) return;
    shownPosition = key;
    feed?.scrollTo({ top: feed.scrollHeight });
  });

  function seek(next: number): void {
    playing = false;
    rawPosition = Math.min(Math.max(0, next), lastPosition);
  }

  /** A preset picks its own multiplier; `custom` keeps the current one and seeds the field with it. */
  function chooseSpeed(value: string): void {
    if (value === 'custom') {
      customText = String(speed);
      speedChoice = 'custom';
      return;
    }
    speedChoice = Number(value);
    speed = Number(value);
  }

  /** The field's text drives playback only while it parses to a usable multiplier. */
  function setCustomSpeed(text: string): void {
    customText = text;
    const parsed = parseSpeed(text);
    if (parsed !== null) speed = parsed;
  }
</script>

<section class="flex flex-col gap-3">
  <div class="flex flex-wrap items-baseline justify-between gap-2">
    <h2 class="font-display text-lg font-semibold">{context.problemSet?.title ?? 'Replay'}</h2>
    <span class="text-xs text-base-content/60">
      Problem: {context.problem?.name ?? 'unknown'} · {frames.length} entries · {deltas.length} text edits ·
      {formatElapsed(totalMs)}
    </span>
  </div>

  {#if frames.length === 0 || !frame}
    <p class="rounded-box bg-base-200 p-8 text-center text-base-content/60">No logs to replay.</p>
  {:else}
    <div class="flex flex-wrap items-center gap-2">
      <Button
        class="btn-sm"
        disabled={position === 0}
        onclick={() => seek(0)}>Restart</Button
      >
      <Button
        class="btn-sm"
        disabled={position === 0}
        onclick={() => seek(position - 1)}>Previous</Button
      >
      {#if playing}
        <Button
          class="btn-sm btn-primary"
          onclick={() => (playing = false)}>Pause</Button
        >
      {:else}
        <Button
          class="btn-sm btn-primary"
          onclick={() => {
            if (position >= lastPosition) rawPosition = 0;
            playing = true;
          }}>Play</Button
        >
      {/if}
      <Button
        class="btn-sm"
        disabled={position >= lastPosition}
        onclick={() => seek(position + 1)}>Next</Button
      >
      <Select
        id="replay-speed"
        class="select-bordered select-sm w-28"
        aria-label="Playback speed"
        value={speedChoice === 'custom' ? 'custom' : speedChoice}
        onchange={(e) => chooseSpeed(e.currentTarget.value)}
      >
        {#each SPEEDS as option (option)}
          <option value={option}>{option}×</option>
        {/each}
        <option value="custom">Custom…</option>
      </Select>
      {#if speedChoice === 'custom'}
        {@const customSpeed = parseSpeed(customText)}
        <input
          id="replay-custom-speed"
          class="input input-bordered input-sm w-20"
          class:input-error={customSpeed === null}
          type="number"
          min={MIN_SPEED}
          max={MAX_SPEED}
          step="0.1"
          value={customText}
          oninput={(e) => setCustomSpeed(e.currentTarget.value)}
          aria-label="Custom playback speed"
          title="{MIN_SPEED}×–{MAX_SPEED}×, any multiplier"
        />
        <span class="text-xs text-base-content/60">×</span>
        {#if customSpeed === null}
          <!-- Playback keeps its last usable speed, so say why this one is not it. -->
          <span
            class="text-xs text-error"
            data-testid="speed-rejected">{MIN_SPEED}×–{MAX_SPEED}× only</span
          >
        {/if}
      {/if}
      <span
        data-testid="replay-clock"
        class="ml-auto font-mono text-xs text-base-content/60"
        >{formatElapsed(frame.elapsedMs)} / {formatElapsed(totalMs)}</span
      >
    </div>

    <div class="flex flex-col gap-1">
      <!-- The timeline: one slice per entry, as wide as the time it covers and
         coloured by the kind of entry it is. Width carries time, so the events
         stand taller while text edits sit in a thin lane along the bottom —
         height is the one dimension that can mark them without lying about
         when they happened. -->
      <div
        class="relative h-7 w-full overflow-hidden rounded-sm"
        data-testid="replay-timeline"
      >
        <div class="flex h-full w-full items-end">
          {#each frames as tapeFrame, index (tapeFrame.entry.id)}
            {@const isEdit = tapeFrame.entry.type === TEXT_EDIT}
            <button
              class="shrink-0 cursor-pointer border-0 p-0 {isEdit ? 'h-2' : 'h-full'}"
              class:opacity-30={index > position}
              style="width: {slices[index]?.widthPercent ?? 0}%; background-color: {colorOf(
                colors,
                tapeFrame.entry.type
              )}"
              title="{formatElapsed(tapeFrame.elapsedMs)} · {tapeFrame.entry.type}"
              aria-label="Seek to {formatElapsed(tapeFrame.elapsedMs)}: {tapeFrame.entry.type}"
              data-testid="replay-slice"
              data-entry-type={tapeFrame.entry.type}
              onclick={() => seek(index)}
            ></button>
          {/each}
        </div>
        <div
          class="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-base-content"
          style="left: {playheadPercent}%"
          data-testid="replay-playhead"
        ></div>
      </div>
      <input
        class="range range-primary range-xs w-full"
        type="range"
        min="0"
        max={lastPosition}
        bind:value={rawPosition}
        oninput={() => (playing = false)}
        aria-label="Replay position"
      />
      <ul
        class="flex flex-wrap items-center gap-x-3 gap-y-1"
        data-testid="replay-legend"
      >
        {#each [...colors] as [type, color] (type)}
          <li class="flex items-center gap-1 text-xs text-base-content/60">
            <span
              class="inline-block size-2 rounded-full"
              style="background-color: {color}"
            ></span>
            {type}
          </li>
        {/each}
      </ul>
    </div>

    <div class="grid gap-3 lg:grid-cols-2">
      <div class="flex min-w-0 flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-base-content/60">Code</span>
          <span class="text-xs text-base-content/40"
            >after {editStep} / {deltas.length} text edit{deltas.length === 1 ? '' : 's'}</span
          >
          {#if slotLabel}
            <Badge class="badge-neutral">{slotLabel}</Badge>
          {/if}
        </div>
        <pre
          data-testid="replay-code"
          class="max-h-[28rem] overflow-auto rounded-box bg-base-200 p-3 text-xs">{code}</pre>
        {#if deltas.length === 0}
          <p class="text-xs text-base-content/60">This session has no text edits; the code is its starting document.</p>
        {:else if diverged}
          <p class="text-xs text-base-content/60">
            The replayed code ends where this session saved a different document (an editor reload can do that).
          </p>
        {/if}
      </div>

      <div class="flex min-w-0 flex-col gap-2">
        <div class="rounded-box bg-base-200 p-4">
          <div class="flex flex-wrap items-center gap-3">
            <span class="font-mono text-sm text-primary">{formatElapsed(frame.elapsedMs)}</span>
            <time
              class="text-sm text-base-content/60"
              datetime={frame.entry.timestamp}>{formatLogTimestamp(frame.entry.timestamp)}</time
            >
            <Badge class="badge-neutral gap-1">
              <span
                class="inline-block size-2 rounded-full"
                style="background-color: {colorOf(colors, frame.entry.type)}"
              ></span>
              {frame.entry.type}
            </Badge>
          </div>
          <pre
            data-testid="replay-frame"
            class="mt-3 max-h-52 overflow-auto rounded-box bg-base-300 p-3 text-xs">{JSON.stringify(
              frame.entry.data,
              null,
              2
            )}</pre>
        </div>

        <div
          bind:this={feed}
          data-testid="replay-feed"
          class="max-h-56 overflow-auto rounded-box bg-base-200 p-2"
        >
          <ol class="flex flex-col">
            {#each frames.slice(0, position + 1) as tapeFrame, index (tapeFrame.entry.id)}
              <li>
                <button
                  class="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-base-300"
                  class:bg-base-300={index === position}
                  onclick={() => seek(index)}
                >
                  <span class="w-16 shrink-0 font-mono tabular-nums text-base-content/60"
                    >{formatElapsed(tapeFrame.elapsedMs)}</span
                  >
                  <span
                    class="shrink-0"
                    style="color: {colorOf(colors, tapeFrame.entry.type)}">{tapeFrame.entry.type}</span
                  >
                  <span class="truncate pl-2 text-base-content/40">{previewOf(tapeFrame.entry.data)}</span>
                </button>
              </li>
            {/each}
          </ol>
        </div>
      </div>
    </div>
  {/if}
</section>
