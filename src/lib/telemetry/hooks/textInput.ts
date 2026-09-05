import type { editor } from 'monaco-editor';
import { TelemetryHook, type Entry } from '../telemetryHook';
import type { TextEvent } from '../types/textEvent';
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

export class TextInputHook extends TelemetryHook {
  public monacoHook(monaco: editor.IStandaloneCodeEditor): () => void {
    const eventQueue: [Entry<Partial<TextEvent>>, number][] = [];
    let textEventQueue: [Entry<Partial<TextEvent>>, number][] = [];
    let timeout: number | NodeJS.Timeout | undefined;
    let prevText: string = monaco.getModel()?.getLinesContent().join('\n') || '';

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
      e.changes.forEach(({ rangeLength, rangeOffset, text }) => {
        const old = prevText.substring(rangeOffset, rangeOffset + rangeLength);
        eventQueue.push([{ type: 'TEXT_MODIFIED', data: { old, offset: rangeOffset, new: text } }, performance.now()]);
        prevText = monaco.getModel()?.getLinesContent().join('\n') || '';
      });
    });

    return () => {
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
