/** What recorded offsets count: `\n` as one character, or `\r\n` as two. */
export type LineEndings = 'lf' | 'crlf';

/**
 * One text edit: `new` replaces `old` at `offset`. What a `TEXT_MODIFIED` entry
 * carries before its input reason is attached, and what a replay applies.
 *
 * The recorder normalizes to `\n` and writes `lineEndings: 'lf'`, so `offset`
 * counts in that same frame — the length of the text before the edit with
 * `\r\n` read as `\n`. A replay applies those to an LF document without
 * translating; mixing frames (a raw offset against an LF slice) is what made
 * edits that touch a line break misreport their span. Entries recorded before
 * the field existed omit it, and a replay has to fall back to a guess.
 */
export interface TextEdit {
  old: string;
  new: string;
  offset: number;
  /**
   * The frame `offset` and the length of `old` are counted in. Recorders
   * normalize to LF and write `'lf'`; entries recorded before this field
   * existed omit it.
   */
  lineEndings?: LineEndings;
}

/** A {@link TextEdit} with the input that caused it. */
export interface TextEvent extends TextEdit {
  type: 'userInput' | 'reset' | 'undo' | 'redo' | 'paste';
}
