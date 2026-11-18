import type { SessionLogDocument, SessionLogEntry, SessionLogSlot } from '$lib/analytics/sessionLogView';
import type { LineEndings, TextEdit } from '$lib/telemetry/types/textEvent';
import { TEXT_EDIT } from './tape';

export type { LineEndings } from '$lib/telemetry/types/textEvent';

/** A {@link TextEdit} read from a stored entry, with the moment it happened. */
interface TextDelta extends TextEdit {
  timestamp: string;
}

/**
 * The text edits of `entries`, in the order they are given — pass the entries
 * oldest first. Entries of other types, and entries whose payload is not
 * `{ offset: number, old: string, new: string }`, are skipped. A payload that
 * names the frame its offsets count in keeps it; one that does not stays
 * unmarked, so the replay can tell a legacy entry from a tagged one.
 */
export function textDeltas(entries: SessionLogEntry[]): TextDelta[] {
  const deltas: TextDelta[] = [];
  for (const entry of entries) {
    if (entry.type !== TEXT_EDIT) continue;
    const data = entry.data;
    // A JSON value narrowed to its object case, which is all a payload can be.
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
    const { offset, old, new: inserted, lineEndings: frame } = data;
    if (typeof offset !== 'number' || typeof old !== 'string' || typeof inserted !== 'string') continue;
    const recorded = frame === 'lf' || frame === 'crlf' ? frame : undefined;
    deltas.push({
      timestamp: entry.timestamp,
      offset,
      old,
      new: inserted,
      ...(recorded ? { lineEndings: recorded } : {})
    });
  }
  return deltas;
}

/** `text` with its line endings normalized to `\n`. */
const toLf = (text: string) => text.replaceAll('\r\n', '\n');

/** `text` with its line endings normalized to `\r\n`. */
const toCrlf = (text: string) => toLf(text).replaceAll('\n', '\r\n');

/**
 * The frame the replay should fall back to for entries that recorded none: a
 * legacy editor writing `\r\n` into the text it inserted was a CRLF one, and a
 * recording that never inserted a line break gets `lf`, the frame this recorder
 * writes today.
 *
 * Only unmarked entries are considered — a recording that tagged every delta
 * has no legacy portion, and its fallback is never used.
 */
export function legacyLineEndings(deltas: readonly TextEdit[]): LineEndings {
  return deltas.some((delta) => delta.lineEndings === undefined && delta.new.includes('\r\n')) ? 'crlf' : 'lf';
}

/** One point of the replay: the document, and where that step's edit landed in it. */
export interface ReplayStep {
  /** The document after this step, in LF. */
  text: string;
  /** The step's edit offset, in `text`'s LF coordinates; 0 for the base. */
  offset: number;
  /**
   * Set when the log could not supply the span of some edit up to here, so
   * `text` is a best-effort reconstruction rather than the document the editor
   * held. Cleared by the next {@link CodeSnapshot}.
   */
  approximate: boolean;
}

/** A full copy of the code the log carries, taken when the session ran, submitted, or every 50 frames. */
export interface CodeSnapshot {
  /** The number of text edits before this snapshot: the step it belongs to. */
  beforeEdit: number;
  /** The code as the editor held it, with its own line endings. */
  code: string;
}

/**
 * The code snapshots in `entries`, in order — pass them oldest first.
 *
 * A run, submit, or periodic `CODE_SNAPSHOT` logs the whole document it graded,
 * which is the one state in a recording that is known exactly. Replaying from
 * it bounds a reconstruction that has drifted: whatever the log lost up to that
 * point stops mattering at the snapshot, and everything after it starts again
 * from the truth.
 */
export function codeSnapshots(entries: SessionLogEntry[]): CodeSnapshot[] {
  const snapshots: CodeSnapshot[] = [];
  let beforeEdit = 0;
  for (const entry of entries) {
    if (entry.type === TEXT_EDIT) {
      beforeEdit += 1;
      continue;
    }
    // `RUN_ATTEMPT` carries the graded code; `CUSTOM_RUN` nests it under
    // `execution`. Both are the same document a run started from.
    const data = entry.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
    const direct = 'submittedCode' in data ? data.submittedCode : undefined;
    const nested =
      'execution' in data && data.execution && typeof data.execution === 'object' && !Array.isArray(data.execution)
        ? data.execution.submittedCode
        : undefined;
    const code = typeof direct === 'string' ? direct : typeof nested === 'string' ? nested : undefined;
    if (code === undefined) continue;
    snapshots.push({ beforeEdit, code });
  }
  return snapshots;
}

/**
 * The replay of `base` under `deltas`, one step each, the base first. An offset
 * past the end of the buffer is clamped to it.
 *
 * A replay reads and shows LF, so every `text` here is LF and every step's
 * `offset` is an LF offset. Each delta is interpreted in the frame it recorded:
 * under `crlf` the buffer those numbers were taken from is rebuilt (`\n`
 * written as `\r\n`), the span is located in it, and the result is read back as
 * LF. That is how a recording made before the recorder normalized to LF replays
 * in its own frame while a later LF stretch of the same session replays in its
 * own. `fallbackLineEndings` is only for entries that recorded no frame.
 *
 * A delta's recorded `old` is checked against the text it claims to replace;
 * verification normalizes both sides. A `snapshot` at a step replaces the
 * reconstruction with code the log knows exactly.
 *
 * Recordings made before the recorder read the model properly lost the span of
 * some deletions: `old` came back empty for a backspace, or held text from
 * somewhere else entirely. Those steps cannot be applied as recorded, so the
 * step is flagged `approximate` — the document from there on is as close as the
 * log allows, not the document the editor held. A legacy edit whose frame
 * cannot be known is marked the same way, because an LF reading of a CRLF
 * offset lands a character off past the first line break.
 */
export function replaySteps(
  base: string,
  deltas: readonly TextEdit[],
  fallbackLineEndings: LineEndings = 'lf',
  snapshots: readonly CodeSnapshot[] = []
): ReplayStep[] {
  const lf = toLf(base);
  // One entry per step, so index `i` is the code known before step `i`: index 0
  // is the base and index `deltas.length` is after the last edit. Two runs with
  // no keystroke between them leave the later code, which is the one graded.
  const snapshotAt: (string | undefined)[] = new Array<string | undefined>(deltas.length + 1);
  for (const snapshot of snapshots) {
    if (snapshot.beforeEdit <= deltas.length) snapshotAt[snapshot.beforeEdit] = toLf(snapshot.code);
  }

  const steps: ReplayStep[] = [{ text: snapshotAt[0] ?? lf, offset: 0, approximate: false }];
  let text = steps[0].text;

  /** Adopt the code a snapshot proves, as the document at step `step`. */
  const adopt = (step: number): boolean => {
    const snapshot = snapshotAt[step];
    if (snapshot === undefined) return false;
    text = snapshot;
    steps[step] = { text: snapshot, offset: steps[step]?.offset ?? 0, approximate: false };
    return true;
  };

  for (const [index, delta] of deltas.entries()) {
    // A snapshot logged between two edits is the document as of the step before
    // this edit, so it replaces what the deltas up to here reconstructed.
    const anchored = adopt(index);
    const frame = delta.lineEndings ?? fallbackLineEndings;
    const removed = toLf(delta.old);
    let offsetLf: number;
    let verified: boolean;
    if (frame === 'crlf') {
      // The offsets index a buffer with two characters per line break; the span
      // is located there, then both sides are compared and the result kept LF.
      const raw = toCrlf(text);
      const offset = Math.min(Math.max(0, delta.offset), raw.length);
      offsetLf = toLf(raw.slice(0, offset)).length;
      verified = toLf(raw.slice(offset, offset + toCrlf(delta.old).length)) === removed;
    } else {
      offsetLf = Math.min(Math.max(0, delta.offset), text.length);
      verified = toLf(text.slice(offsetLf, offsetLf + delta.old.length)) === removed;
    }
    // The frame is uncertain only where a legacy delta falls back to LF and
    // line breaks are actually in play before or in this edit.
    const frameUncertain =
      delta.lineEndings === undefined &&
      fallbackLineEndings === 'lf' &&
      (text.slice(0, offsetLf).includes('\n') || delta.old.includes('\n') || delta.new.includes('\n'));
    // An edit whose `old` is not the text it claims to replace was recorded by a
    // build that could not read the model back; `old` empty on a deletion is the
    // same failure with the span lost entirely.
    const lost = delta.new === '' && delta.old === '';
    const approximate = anchored ? false : steps.at(-1)!.approximate || !verified || lost || frameUncertain;
    text = text.slice(0, offsetLf) + toLf(delta.new) + text.slice(offsetLf + removed.length);
    steps.push({ text, offset: offsetLf, approximate });
  }

  // A run after the last edit proves the final step.
  adopt(deltas.length);
  return steps;
}

/**
 * The code a replay starts from: the assembled template for a slot problem,
 * or the starting template for a non-slot one. It is the session's frozen
 * `starter_code_snapshot`, which `buildSessionLogDocument` carries as
 * `template`, while its `baseCode` is `''` for a non-slot problem.
 */
export function replayBase(document: SessionLogDocument | null): string {
  if (!document) return '';
  return document.usesSlots ? document.baseCode : document.template;
}

/** The label of the slot whose range contains `offset` in `text`, or `null` when it is outside every slot. */
export function slotAt(slots: SessionLogSlot[], text: string, offset: number): string | null {
  if (offset < 0 || offset > text.length) return null;
  const before = text.slice(0, offset);
  const line = before.split('\n').length;
  const column = offset - (before.lastIndexOf('\n') + 1) + 1;
  for (const slot of slots) {
    const [startLine, startColumn, endLine, endColumn] = slot.range;
    if (line < startLine || line > endLine) continue;
    if (line === startLine && column < startColumn) continue;
    // A range's end column is one past the slot's last character, i.e. the
    // position right before the line break, so an insertion there is the slot's.
    if (line === endLine && column > endColumn) continue;
    return slot.label;
  }
  return null;
}
