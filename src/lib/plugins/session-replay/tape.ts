import type { JsonValue } from '@zenstackhq/orm';
import type { SessionLogEntry } from '$lib/analytics/sessionLogView';

/** One point of the replay: an entry, and how far into the session it happened. */
interface TapeFrame {
  entry: SessionLogEntry;
  elapsedMs: number;
}

/** How long one frame stays on screen at 1×; the transport's speeds divide it. */
export const FRAME_MS = 800;

/**
 * The elapsed time that counts as one additive unit of timeline width. A frame
 * always gets its base tick, so a second of waiting doubles a frame's weight and
 * an hour of it adds eight — enough to stand out without erasing the rest.
 */
const TICK_MS = 1000;

/** The playback speeds the transport offers as presets, slowest first. */
export const SPEEDS = [0.5, 1, 2, 4] as const;

/**
 * The multipliers a custom speed may name. The floor keeps a session of a few
 * entries from taking minutes; the ceiling keeps the timer off its own minimum
 * (20× is one frame every 40 ms).
 */
export const MIN_SPEED = 0.1;
export const MAX_SPEED = 20;

/**
 * A typed multiplier, or `null` when the text is not a usable one: not a
 * number, not positive, or outside {@link MIN_SPEED}–{@link MAX_SPEED}. The
 * caller keeps its previous speed on `null`, so a half-typed value never
 * changes playback.
 */
export function parseSpeed(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const speed = Number(trimmed);
  if (!Number.isFinite(speed) || speed < MIN_SPEED || speed > MAX_SPEED) return null;
  return speed;
}

/** The frame duration at `speed`: 800 ms at 1×, 200 ms at 4×. A finite, non-zero delay for any usable speed. */
export function frameDuration(speed: number): number {
  const usable = Number.isFinite(speed) ? Math.min(Math.max(speed, MIN_SPEED), MAX_SPEED) : 1;
  return Math.max(1, Math.round(FRAME_MS / usable));
}

/**
 * The replay of `entries` — pass them oldest first, as the session recorded
 * them. Each frame carries its offset from the first entry, so the tape is a
 * clock as well as an order: a session with a ten-minute gap between two
 * events replays those events a frame apart but reports the gap.
 */
export function buildTape(entries: SessionLogEntry[]): TapeFrame[] {
  const start = entries.length > 0 ? Date.parse(entries[0].timestamp) : 0;
  return entries.map((entry) => ({
    entry,
    elapsedMs: Math.max(0, Date.parse(entry.timestamp) - start)
  }));
}

/** `m:ss`, or `h:mm:ss` once the session runs past an hour. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** The entry type whose payload is a text edit; see `replay.ts`. */
export const TEXT_EDIT = 'TEXT_MODIFIED';

/** One slice of the replay's timeline, in percentages of its width. */
export interface TimelineSlice {
  startPercent: number;
  widthPercent: number;
}

/**
 * The timeline's slices: one per frame, widths adding up to 100%.
 *
 * Every frame gets one base tick of width and the elapsed time it covers adds
 * logarithmically on top, so a long idle gap stays visible without erasing the
 * entries around it: a burst of same-second edits keeps a readable slice each,
 * and a minute of waiting is several times a tick rather than the whole tape.
 * Widths are therefore a compressed reading of time, not a proportional one —
 * the clock, the tooltips and the feed labels carry the exact elapsed time.
 */
export function timelineSlices(frames: TapeFrame[]): TimelineSlice[] {
  if (frames.length === 0) return [];

  // A frame covers the time until the next one; the last one covers none of its own.
  const weights = frames.map((frame, index) => {
    const next = frames[index + 1];
    const span = next ? Math.max(0, next.elapsedMs - frame.elapsedMs) : 0;
    return 1 + Math.log1p(span / TICK_MS);
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  let start = 0;
  return weights.map((weight) => {
    const widthPercent = (weight / totalWeight) * 100;
    const slice = { startPercent: start, widthPercent };
    start += widthPercent;
    return slice;
  });
}

/**
 * For each frame, how many text edits the session has made by then, counted
 * inclusively — the index into `replaySteps`' steps that a playhead at this
 * frame shows. It is what ties the entry tape to the code pane: frame `i` of a
 * session with `n` edits before it shows step `i`'s count of `0…n`.
 */
export function textEditCounts(frames: TapeFrame[]): number[] {
  let edits = 0;
  return frames.map((frame) => (frame.entry.type === TEXT_EDIT ? ++edits : edits));
}

/**
 * A frame's payload as one line for the feed: the compact JSON, `…`-truncated
 * so a long payload cannot push the row's other columns out of view. Absent
 * payloads have no preview at all.
 */
export function previewOf(data: JsonValue | null, maxLength = 60): string {
  if (data === null) return '';
  const compact = JSON.stringify(data) ?? '';
  return compact.length > maxLength ? `${compact.slice(0, maxLength)}…` : compact;
}
