import type { editor } from 'monaco-editor';
import { TelemetryHook } from '../telemetryHook';
import type { TextEdit, TextEvent } from '../types/textEvent';

/** `text` with its line endings normalized to `\n`. */
const toLf = (text: string) => text.replaceAll('\r\n', '\n');

/** One model change as Monaco reports it: offsets into the *pre-change* model. */
export interface TextModelChange {
  rangeOffset: number;
  rangeLength: number;
  text: string;
}

/**
 * The deltas for `changes`, and the model text after them.
 *
 * `previous` is the model's own text — line endings and all — because that is
 * what `rangeOffset`/`rangeLength` index: `\r\n` counts two characters there.
 * Slicing the LF view with those numbers instead (which this did) produced an
 * `old` that was one character short per line break, and a replay deletes
 * `old.length` characters, so every multi-line edit left that many behind.
 *
 * The emitted deltas are in LF coordinates, the frame the replay works in:
 * `offset` is the LF length of the text before the change, `old` and `new` are
 * LF. Each delta records that frame as `lineEndings: 'lf'` rather than leaving
 * the replay to infer one for the whole recording, which a session spanning
 * other recorders could not answer correctly.
 *
 * Changes arrive measured against the pre-change model but must be applied in
 * sequence, so they are sorted and each offset is shifted by the net length of
 * the ones already applied.
 */
export function textDeltasOf(
  previous: string,
  changes: readonly TextModelChange[]
): { deltas: TextEdit[]; text: string } {
  const deltas: TextEdit[] = [];
  let text = previous;
  let shift = 0;
  for (const change of [...changes].sort((a, b) => a.rangeOffset - b.rangeOffset)) {
    const offset = change.rangeOffset + shift;
    deltas.push({
      offset: toLf(text.slice(0, offset)).length,
      old: toLf(previous.slice(change.rangeOffset, change.rangeOffset + change.rangeLength)),
      new: toLf(change.text),
      lineEndings: 'lf'
    });
    text = text.slice(0, offset) + change.text + text.slice(offset + change.rangeLength);
    shift += change.text.length - change.rangeLength;
  }
  return { deltas, text };
}

/** `monaco.editor.CursorChangeReason` values this hook reads (kept numeric so Monaco stays a type-only import). */
const CONTENT_FLUSH = 1;
const RECOVER_FROM_MARKERS = 2;
const PASTE = 4;

/** One model content change, held until the task that made it has finished. */
interface Batch {
  /** The model version this change produced; a cursor event names the same one. */
  versionId: number;
  type: TextEvent['type'];
  deltas: TextEdit[];
  /** The model text before this change, to recognise an undo that reverts it exactly. */
  before: string;
}

export class TextInputHook extends TelemetryHook {
  /** The bound editor's text, or `undefined` while a change is still held. */
  private snapshotCode: (() => string | undefined) | undefined;

  public override snapshotText(): string | undefined {
    return this.snapshotCode?.();
  }

  /**
   * Every model content change is recorded, whether or not a cursor event
   * follows it: Monaco fires none for an edit that leaves the caret in place and
   * one for a change that edits several places, so pairing changes with cursor
   * events one to one left changes queued until a later caret move.
   *
   * A change is held only until the current task ends (a 0 ms timer), so two
   * things can arrive first: the cursor event of the same model version, which
   * says whether it was a paste, and the constrained-editor plugin's microtask
   * undo of an edit in locked code, which cancels it.
   */
  public monacoHook(monaco: editor.IStandaloneCodeEditor): () => void {
    let pending: Batch[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    let prevText: string = monaco.getModel()?.getValue() ?? '';

    const flush = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      const batches = pending;
      pending = [];
      for (const batch of batches) {
        for (const delta of batch.deltas) {
          this.addEntry({ type: 'TEXT_MODIFIED', data: { ...delta, type: batch.type } });
        }
      }
    };

    this.snapshotCode = () => (pending.length === 0 ? toLf(monaco.getModel()?.getValue() ?? '') : undefined);

    const changeHook = monaco.onDidChangeModelContent((e) => {
      const before = prevText;
      const { deltas, text } = textDeltasOf(before, e.changes);
      prevText = e.isEolChange ? (monaco.getModel()?.getValue() ?? text) : text;

      // The plugin rejects an edit in locked code by undoing it straight away
      // (it sets `editInRestrictedArea` around that undo). Tell the user why the
      // edit vanished, and when the undo restores exactly the text before the
      // last held change, record neither.
      const last = pending.at(-1);
      const restricted =
        (monaco.getModel() as unknown as { editInRestrictedArea?: boolean } | null)?.editInRestrictedArea === true;
      if (e.isUndoing && restricted) {
        monaco
          .getContribution('editor.contrib.messageController')
          // @ts-expect-error EditorContributions cannot be type narrowed down
          ?.showMessage('Cannot edit this area', monaco.getPosition());
        if (last && text === last.before) {
          pending.pop();
          return;
        }
      }

      if (deltas.length === 0) return;
      pending.push({
        versionId: e.versionId,
        type: e.isFlush ? 'reset' : e.isUndoing ? 'undo' : e.isRedoing ? 'redo' : 'userInput',
        deltas,
        before
      });
      timer ??= setTimeout(flush, 0);
    });

    // Labels only: a cursor event never decides whether a change is recorded.
    const reasonHook = monaco.onDidChangeCursorSelection((e) => {
      const batch = pending.find((b) => b.versionId === e.modelVersionId);
      if (!batch || batch.type !== 'userInput') return;
      const reason: number = e.reason;
      if (reason === PASTE) batch.type = 'paste';
      else if (reason === CONTENT_FLUSH || reason === RECOVER_FROM_MARKERS) batch.type = 'reset';
    });

    // Reset Code swaps in a new model, which fires no content change. Record the
    // swap as one whole-document replacement so the replay follows it.
    const modelHook = monaco.onDidChangeModel(() => {
      flush();
      const next = monaco.getModel()?.getValue() ?? '';
      if (toLf(next) !== toLf(prevText)) {
        this.addEntry({
          type: 'TEXT_MODIFIED',
          data: { offset: 0, old: toLf(prevText), new: toLf(next), lineEndings: 'lf', type: 'reset' }
        });
      }
      prevText = next;
    });

    return () => {
      flush();
      this.snapshotCode = undefined;
      changeHook.dispose();
      reasonHook.dispose();
      modelHook.dispose();
    };
  }
  public windowHook(): () => void {
    return () => {};
  }
  public executionHook(): () => void {
    return () => {};
  }
}
