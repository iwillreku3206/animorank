import type { SessionLogDocument, SessionLogEntry, SessionLogSlot } from '$lib/analytics/sessionLogView';
import type { TextEdit } from '$lib/telemetry/types/textEvent';
import { TEXT_EDIT } from './tape';

/** A {@link TextEdit} read from a stored entry, with the moment it happened. */
interface TextDelta extends TextEdit {
  timestamp: string;
}

/**
 * The text edits of `entries`, in the order they are given — pass the entries
 * oldest first. Entries of other types, and entries whose payload is not
 * `{ offset: number, old: string, new: string }`, are skipped.
 */
export function textDeltas(entries: SessionLogEntry[]): TextDelta[] {
  const deltas: TextDelta[] = [];
  for (const entry of entries) {
    if (entry.type !== TEXT_EDIT) continue;
    const data = entry.data;
    // A JSON value narrowed to its object case, which is all a payload can be.
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
    const { offset, old, new: inserted } = data;
    if (typeof offset !== 'number' || typeof old !== 'string' || typeof inserted !== 'string') continue;
    deltas.push({ timestamp: entry.timestamp, offset, old, new: inserted });
  }
  return deltas;
}

/** `text` with its line endings normalized to `\n`. */
const toLf = (text: string) => text.replaceAll('\r\n', '\n');

/**
 * What the recorded offsets count: `\n` as one character, or `\r\n` as two.
 *
 * One session was typed on one machine, so this is a property of the whole
 * recording, not of an entry: a CRLF editor counts two characters per line
 * break in every offset it reports, an LF editor one.
 */
export type LineEndings = 'lf' | 'crlf';

/**
 * The line endings a recording implies: an editor recording `\r\n` in the text
 * it inserted was a CRLF one. `lf` for a recording that never inserted a line
 * break at all, which is the frame this recorder writes today.
 */
export function recordedLineEndings(deltas: readonly TextEdit[]): LineEndings {
  return deltas.some((delta) => delta.new.includes('\r\n')) ? 'crlf' : 'lf';
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

/** A full copy of the code the log carries, taken when the session ran or submitted. */
export interface CodeSnapshot {
  /** The number of text edits before this snapshot: the step it belongs to. */
  beforeEdit: number;
  /** The code as the editor held it, with its own line endings. */
  code: string;
}

/**
 * The code snapshots in `entries`, in order — pass them oldest first.
 *
 * A run or submit logs the whole document it graded, which is the one state in
 * a recording that is known exactly. Replaying from it bounds a reconstruction
 * that has drifted: whatever the log lost up to that point stops mattering at
 * the snapshot, and everything after it starts again from the truth.
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
 * A replay reads and shows LF, so every `text` here is LF. `lineEndings` decides
 * only what the recorded numbers index: under `crlf` the buffer those numbers
 * were taken from is rebuilt (`\n` written as `\r\n`) and the deltas applied to
 * that, which is how a recording made before the recorder normalized to LF
 * replays in its own frame. Under `lf` the deltas are applied to the LF document
 * directly, which is exact for anything recorded since.
 *
 * The recorded `old` is used for its length alone, and a `snapshot` at a step
 * replaces the reconstruction with code the log knows exactly.
 *
 * Recordings made before the recorder read the model properly lost the span of
 * some deletions: `old` came back empty for a backspace, or held text from
 * somewhere else entirely. Those steps cannot be applied as recorded, so the
 * step is flagged `approximate` — the document from there on is as close as the
 * log allows, not the document the editor held.
 */
export function replaySteps(
  base: string,
  deltas: readonly TextEdit[],
  lineEndings: LineEndings = 'lf',
  snapshots: readonly CodeSnapshot[] = []
): ReplayStep[] {
  const lf = toLf(base);
  const crlf = lineEndings === 'crlf';
  let text = crlf ? lf.replaceAll('\n', '\r\n') : lf;
  // One entry per step, so index `i` is the code known before step `i`: index 0
  // is the base and index `deltas.length` is after the last edit. Two runs with
  // no keystroke between them leave the later code, which is the one graded.
  const snapshotAt: (string | undefined)[] = new Array<string | undefined>(deltas.length + 1);
  for (const snapshot of snapshots) {
    if (snapshot.beforeEdit <= deltas.length) snapshotAt[snapshot.beforeEdit] = toLf(snapshot.code);
  }

  const steps: ReplayStep[] = [{ text: snapshotAt[0] ?? lf, offset: 0, approximate: false }];

  /** Adopt the code a snapshot proves, as the document at step `step`. */
  const adopt = (step: number): boolean => {
    const snapshot = snapshotAt[step];
    if (snapshot === undefined) return false;
    text = crlf ? snapshot.replaceAll('\n', '\r\n') : snapshot;
    steps[step] = { text: snapshot, offset: steps[step]?.offset ?? 0, approximate: false };
    return true;
  };

  for (const [index, delta] of deltas.entries()) {
    // A snapshot logged between two edits is the document as of the step before
    // this edit, so it replaces what the deltas up to here reconstructed.
    const anchored = adopt(index);
    const offset = Math.min(Math.max(0, delta.offset), text.length);
    const offsetLf = crlf ? toLf(text.slice(0, offset)).length : offset;
    const replaced = crlf ? delta.old : toLf(delta.old);
    const inserted = crlf ? delta.new : toLf(delta.new);
    // An edit whose `old` is not the text it claims to replace was recorded by a
    // build that could not read the model back; `old` empty on a deletion is the
    // same failure with the span lost entirely.
    const verified = text.slice(offset, offset + replaced.length) === replaced;
    const lost = delta.new === '' && delta.old === '';
    const approximate = anchored ? false : steps.at(-1)!.approximate || !verified || lost;
    text = text.slice(0, offset) + inserted + text.slice(offset + replaced.length);
    steps.push({ text: crlf ? toLf(text) : text, offset: offsetLf, approximate });
  }

  // A run after the last edit proves the final step.
  adopt(deltas.length);
  return steps;
}

/**
 * The code a replay starts from: the assembled template for a slot problem,
 * or the problem's starter code for a non-slot one. A non-slot editor opens
 * on `starter_code`, which `buildSessionLogDocument` carries as `template`
 * while its `baseCode` is `''` for such problems.
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
