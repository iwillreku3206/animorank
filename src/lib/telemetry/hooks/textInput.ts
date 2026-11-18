import type { editor } from 'monaco-editor';
import { TelemetryHook, type Entry } from '../telemetryHook';
import type { TextEdit, TextEvent } from '../types/textEvent';
import type { monaco } from '$lib/monaco';

const reasonMap: Record<monaco.editor.CursorChangeReason, TextEvent['type']> = {
  '0': 'userInput',
  '1': 'reset',
  '2': 'reset',
  '3': 'userInput',
  '4': 'paste',
  '5': 'undo',
  '6': 'redo'
};

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

export class TextInputHook extends TelemetryHook {
  /**
   * The bound editor's text, or `undefined` while either queue still holds an
   * event: the model updates before the deltas are emitted, so a document read
   * then sits ahead of the history position it would be recorded against.
   */
  private snapshotCode: (() => string | undefined) | undefined;

  public override snapshotText(): string | undefined {
    return this.snapshotCode?.();
  }

  public monacoHook(monaco: editor.IStandaloneCodeEditor): () => void {
    const eventQueue: [Entry<Partial<TextEvent>>, number][] = [];
    let textEventQueue: [Entry<Partial<TextEvent>>, number][] = [];
    let timeout: number | NodeJS.Timeout | undefined;
    let prevText: string = monaco.getModel()?.getValue() ?? '';

    // The live model is the truth once nothing is queued: every delta already
    // emitted has been applied to it, so it is exactly the history position.
    this.snapshotCode = () =>
      eventQueue.length === 0 && textEventQueue.length === 0 ? toLf(monaco.getModel()?.getValue() ?? '') : undefined;

    const reasonHook = monaco.onDidChangeCursorPosition((e) => {
      const ev = eventQueue.shift();
      if (!ev) return;
      const [event, timestamp] = ev;
      event.data.type = reasonMap[e.reason];

      if (textEventQueue.length === 0) {
        textEventQueue.push(ev);
        timeout = setTimeout(() => {
          textEventQueue = textEventQueue.filter((x) => x !== ev);
          this.addEntry(event);
        }, 5);
      } else if (textEventQueue.length === 1 && event.data.type === 'undo') {
        clearTimeout(timeout);
        timeout = undefined;
        if (performance.now() - timestamp < 3) {
          textEventQueue.shift();
          // I don't want to repeat this code, so I'll just create the code to create the tooltip here
          if (monaco) {
            monaco
              .getContribution('editor.contrib.messageController')
              // @ts-expect-error EditorContributions cannot be type narrowed down
              ?.showMessage('Cannot edit this area', monaco.getPosition());
          }
        } else {
          const item = textEventQueue.shift()?.[0];
          this.addEntry(item!);
          this.addEntry(event);
        }
      } else {
        clearTimeout(timeout);
        timeout = undefined;
        const item = textEventQueue.shift()?.[0];
        this.addEntry(item!);
        this.addEntry(event);
      }
    });
    const changeHook = monaco.onDidChangeModelContent((e) => {
      const { deltas, text } = textDeltasOf(prevText, e.changes);
      prevText = text;
      for (const delta of deltas) {
        eventQueue.push([{ type: 'TEXT_MODIFIED', data: delta }, performance.now()]);
      }
    });

    return () => {
      this.snapshotCode = undefined;
      reasonHook.dispose();
      changeHook.dispose();
    };
  }
  public windowHook(): () => void {
    return () => {};
  }
  public executionHook(): () => void {
    return () => {};
  }
}
