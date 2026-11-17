/**
 * One text edit: `new` replaces `old` at `offset`. What a `TEXT_MODIFIED` entry
 * carries before its input reason is attached, and what a replay applies.
 *
 * Line endings are normalized to `\n` throughout, and `offset` counts in that
 * same frame — the length of the text before the edit with `\r\n` read as `\n`.
 * A replay applies these to an LF document without translating; mixing frames
 * (a raw offset against an LF slice) is what made edits that touch a line break
 * misreport their span.
 */
export interface TextEdit {
  old: string;
  new: string;
  offset: number;
}

/** A {@link TextEdit} with the input that caused it. */
export interface TextEvent extends TextEdit {
  type: 'userInput' | 'reset' | 'undo' | 'redo' | 'paste';
}
