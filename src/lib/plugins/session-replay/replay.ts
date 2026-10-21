import type { SessionLogEntry, SessionLogSlot } from '$lib/analytics/sessionLogView';
import { TEXT_EDIT } from './tape';

/** One `TEXT_MODIFIED` entry: `new` replaces `old` at `offset`. */
interface TextDelta {
  timestamp: string;
  offset: number;
  old: string;
  new: string;
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

/**
 * The document after each step: index 0 is `base`, index `i` the text after
 * delta `i - 1`. An offset past the end of the buffer is clamped to it.
 */
export function replayTexts(base: string, deltas: TextDelta[]): string[] {
  const texts = [base];
  let text = base;
  for (const delta of deltas) {
    const offset = Math.min(Math.max(0, delta.offset), text.length);
    text = text.slice(0, offset) + delta.new + text.slice(offset + delta.old.length);
    texts.push(text);
  }
  return texts;
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
