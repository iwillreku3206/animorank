import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { editor } from 'monaco-editor';
import { TextInputHook, textDeltasOf, type TextModelChange } from './textInput';
import type { Entry } from '../telemetryHook';
import type { TextEvent } from '../types/textEvent';
import { replaySteps } from '$lib/plugins/session-replay/replay';

/** The document a recording replays to, in the frame the recorder writes. */
const replayed = (base: string, deltas: Parameters<typeof replaySteps>[1]) =>
  replaySteps(base, deltas, 'lf').at(-1)?.text;

describe('textDeltasOf', () => {
  it('slices old from the model text, so a CRLF edit reports the span it deleted', () => {
    // Monaco measures a change against its own buffer, where the line break is
    // two characters. Slicing the LF view with those numbers gave an `old` one
    // character short per line break, and the replay deletes `old.length`.
    const before = 'int main() {\r\n    return 0;\r\n}  ';
    const { deltas, text } = textDeltasOf(before, [{ rangeOffset: 12, rangeLength: 15, text: '' }]);

    expect(deltas).toEqual([{ offset: 12, old: '\n    return 0;', new: '', lineEndings: 'lf' }]);
    expect(text).toBe('int main() {\r\n}  ');
    expect(replayed(before, deltas)).toBe('int main() {\n}  ');
  });

  it('replays what it recorded, line breaks included', () => {
    const before = 'int main() {\r\n    return 0;\r\n}\r\n';
    // Delete the whole body line, then type a replacement into the empty body.
    const first = textDeltasOf(before, [{ rangeOffset: 12, rangeLength: 15, text: '' }]);
    const second = textDeltasOf(first.text, [{ rangeOffset: 12, rangeLength: 0, text: '\r\n    return 7;' }]);
    const deltas = [...first.deltas, ...second.deltas];

    expect(replayed(before, deltas)).toBe('int main() {\n    return 7;\n}\n');
  });

  it('shifts a later change by the length the earlier ones added', () => {
    const { deltas } = textDeltasOf('abc', [
      { rangeOffset: 1, rangeLength: 0, text: 'X' },
      { rangeOffset: 3, rangeLength: 0, text: 'Y' }
    ]);

    expect(deltas).toEqual([
      { offset: 1, old: '', new: 'X', lineEndings: 'lf' },
      { offset: 4, old: '', new: 'Y', lineEndings: 'lf' }
    ]);
    expect(replayed('abc', deltas)).toBe('aXbcY');
  });

  it('reports a backspace at the end of a CRLF document, which logged an empty old', () => {
    // The LF view is one character shorter per line break, so a raw offset near
    // the end fell past it and `old` came back empty: the replay then deleted
    // nothing and the character survived. Every such edit shifted the rest of
    // the session.
    const before = 'int main() {\r\n    return 0;\r\n}\r\n';
    const { deltas } = textDeltasOf(before, [{ rangeOffset: 30, rangeLength: 2, text: '' }]);

    expect(deltas).toEqual([{ offset: 28, old: '\n', new: '', lineEndings: 'lf' }]);
    expect(replayed(before, deltas)).toBe('int main() {\n    return 0;\n}');
  });

  it('reports a replacement as its own old and new', () => {
    const { deltas } = textDeltasOf('a\r\nb', [{ rangeOffset: 1, rangeLength: 2, text: '\r\nc' }]);

    expect(deltas).toEqual([{ offset: 1, old: '\n', new: '\nc', lineEndings: 'lf' }]);
  });
});

/** `monaco.editor.CursorChangeReason.Paste`. */
const PASTE = 4;

/** A model as the hook reads it: its text, and the constrained-editor plugin's flag. */
const fakeModel = (value: string) => {
  const model = { value, editInRestrictedArea: false, getValue: () => model.value };
  return model;
};

/**
 * A TextInputHook recording a fake editor. The fake has only the events the
 * hook listens to, and a test fires them by hand in the order Monaco would.
 */
function recorder(initial: string) {
  let model = fakeModel(initial);
  let versionId = 1;
  let onContent: (_event: object) => void = () => {};
  let onSelection: (_event: object) => void = () => {};
  let onModel: () => void = () => {};
  const showMessage = vi.fn();
  const fakeEditor = {
    getModel: () => model,
    getPosition: () => ({ lineNumber: 1, column: 1 }),
    getContribution: () => ({ showMessage }),
    onDidChangeModelContent: (callback: typeof onContent) => {
      onContent = callback;
      return { dispose: () => {} };
    },
    onDidChangeCursorSelection: (callback: typeof onSelection) => {
      onSelection = callback;
      return { dispose: () => {} };
    },
    onDidChangeModel: (callback: typeof onModel) => {
      onModel = callback;
      return { dispose: () => {} };
    }
  } as unknown as editor.IStandaloneCodeEditor;

  const entries: Entry<TextEvent>[] = [];
  const hook = new TextInputHook((entry) => {
    entries.push(entry as Entry<TextEvent>);
  });
  const dispose = hook.monacoHook(fakeEditor);

  return {
    hook,
    entries,
    dispose,
    showMessage,
    model: () => model,
    /** Applies `changes` to the model and fires their one content event. Returns the version it produced. */
    edit(changes: TextModelChange[], flags: { isUndoing?: boolean; isRedoing?: boolean; isFlush?: boolean } = {}) {
      model.value = textDeltasOf(model.value, changes).text;
      versionId += 1;
      onContent({
        changes,
        versionId,
        isUndoing: false,
        isRedoing: false,
        isFlush: false,
        isEolChange: false,
        ...flags
      });
      return versionId;
    },
    /** Fires a cursor-selection event that names `modelVersionId`. */
    cursor(modelVersionId: number, reason: number) {
      onSelection({ modelVersionId, reason });
    },
    /** Swaps in a new model, as Reset Code does with `setModel`. */
    swapModel(value: string) {
      model = fakeModel(value);
      onModel();
    },
    /** The document the recorded entries replay to. */
    replay: () =>
      replayed(
        initial,
        entries.map((entry) => entry.data)
      )
  };
}

describe('TextInputHook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('records a change that no cursor event follows, once the task ends', () => {
    // A forward Delete leaves the caret in place, so Monaco fires no cursor
    // event. The old hook held such a change until the caret next moved.
    const rec = recorder('int main() {}');
    rec.edit([{ rangeOffset: 3, rangeLength: 1, text: '' }]);
    expect(rec.entries).toHaveLength(0);

    vi.runAllTimers();
    expect(rec.entries).toEqual([
      { type: 'TEXT_MODIFIED', data: { offset: 3, old: ' ', new: '', lineEndings: 'lf', type: 'userInput' } }
    ]);
    expect(rec.replay()).toBe('intmain() {}');
  });

  it('records every change of a multi-cursor edit, which fires one cursor event', () => {
    const rec = recorder('a\nb\nc');
    const version = rec.edit([
      { rangeOffset: 4, rangeLength: 0, text: 'X' },
      { rangeOffset: 2, rangeLength: 0, text: 'X' },
      { rangeOffset: 0, rangeLength: 0, text: 'X' }
    ]);
    rec.cursor(version, 0);
    vi.runAllTimers();

    expect(rec.entries.map((entry) => entry.data)).toEqual([
      { offset: 0, old: '', new: 'X', lineEndings: 'lf', type: 'userInput' },
      { offset: 3, old: '', new: 'X', lineEndings: 'lf', type: 'userInput' },
      { offset: 6, old: '', new: 'X', lineEndings: 'lf', type: 'userInput' }
    ]);
    expect(rec.replay()).toBe('Xa\nXb\nXc');
  });

  it('labels a change paste only from the cursor event of its own model version', () => {
    const rec = recorder('');
    const pasted = rec.edit([{ rangeOffset: 0, rangeLength: 0, text: 'int x;' }]);
    rec.cursor(pasted, PASTE);
    const typed = rec.edit([{ rangeOffset: 6, rangeLength: 0, text: '\n' }]);
    rec.cursor(typed + 1, PASTE);
    vi.runAllTimers();

    expect(rec.entries.map((entry) => entry.data.type)).toEqual(['paste', 'userInput']);
  });

  it('labels undo, redo and model flushes from the content event', () => {
    const rec = recorder('abc');
    rec.edit([{ rangeOffset: 3, rangeLength: 0, text: 'd' }], { isUndoing: true });
    rec.edit([{ rangeOffset: 4, rangeLength: 0, text: 'e' }], { isRedoing: true });
    rec.edit([{ rangeOffset: 0, rangeLength: 5, text: 'xyz' }], { isFlush: true });
    vi.runAllTimers();

    expect(rec.entries.map((entry) => entry.data.type)).toEqual(['undo', 'redo', 'reset']);
    expect(rec.replay()).toBe('xyz');
  });

  it('drops an edit the constrained-editor plugin undoes in locked code, and tells the user', () => {
    const rec = recorder('int main() {}');
    rec.edit([{ rangeOffset: 0, rangeLength: 0, text: 'x' }]);
    // The plugin's microtask undo, with its flag set around the call.
    rec.model().editInRestrictedArea = true;
    rec.edit([{ rangeOffset: 0, rangeLength: 1, text: '' }], { isUndoing: true });
    rec.model().editInRestrictedArea = false;
    vi.runAllTimers();

    expect(rec.entries).toEqual([]);
    expect(rec.showMessage).toHaveBeenCalledOnce();
    expect(rec.showMessage).toHaveBeenCalledWith('Cannot edit this area', { lineNumber: 1, column: 1 });
  });

  it('records both changes when the plugin undo does not restore the text exactly', () => {
    const rec = recorder('int main() {}');
    rec.edit([{ rangeOffset: 0, rangeLength: 0, text: 'x' }]);
    rec.model().editInRestrictedArea = true;
    rec.edit([{ rangeOffset: 13, rangeLength: 1, text: '' }], { isUndoing: true });
    rec.model().editInRestrictedArea = false;
    vi.runAllTimers();

    expect(rec.entries.map((entry) => entry.data.type)).toEqual(['userInput', 'undo']);
    expect(rec.replay()).toBe('xint main() {');
    expect(rec.showMessage).toHaveBeenCalledOnce();
  });

  it("records the user's own undo, which the plugin does not flag", () => {
    const rec = recorder('int main() {}');
    rec.edit([{ rangeOffset: 0, rangeLength: 0, text: 'x' }]);
    rec.edit([{ rangeOffset: 0, rangeLength: 1, text: '' }], { isUndoing: true });
    vi.runAllTimers();

    expect(rec.entries.map((entry) => entry.data.type)).toEqual(['userInput', 'undo']);
    expect(rec.replay()).toBe('int main() {}');
    expect(rec.showMessage).not.toHaveBeenCalled();
  });

  it("records Reset Code's model swap as one reset, and measures later edits against the new text", () => {
    const rec = recorder('int main() {\r\n  return 1;\r\n}');
    // Still held when the swap arrives, so it must be recorded first.
    rec.edit([{ rangeOffset: 23, rangeLength: 1, text: '2' }]);
    rec.swapModel('int main() {\r\n  return 0;\r\n}');
    rec.edit([{ rangeOffset: 23, rangeLength: 1, text: '5' }]);
    vi.runAllTimers();

    expect(rec.entries.map((entry) => entry.data)).toEqual([
      { offset: 22, old: '1', new: '2', lineEndings: 'lf', type: 'userInput' },
      {
        offset: 0,
        old: 'int main() {\n  return 2;\n}',
        new: 'int main() {\n  return 0;\n}',
        lineEndings: 'lf',
        type: 'reset'
      },
      { offset: 22, old: '0', new: '5', lineEndings: 'lf', type: 'userInput' }
    ]);
    expect(rec.replay()).toBe('int main() {\n  return 5;\n}');
  });

  it('flushes held changes on disposal', () => {
    const rec = recorder('a');
    rec.edit([{ rangeOffset: 1, rangeLength: 0, text: 'b' }]);
    rec.dispose();
    expect(rec.entries).toHaveLength(1);

    vi.runAllTimers();
    expect(rec.entries).toHaveLength(1);
  });

  it('reads the editor for a snapshot only while nothing is held, and never after disposal', () => {
    const rec = recorder('int main() {}\r\n');
    expect(rec.hook.snapshotText()).toBe('int main() {}\n');

    // The model moves before the change is recorded, so the document is ahead
    // of the history for as long as the change is held.
    rec.edit([{ rangeOffset: 12, rangeLength: 0, text: ' return 0; ' }]);
    expect(rec.hook.snapshotText()).toBeUndefined();

    vi.runAllTimers();
    expect(rec.entries).toHaveLength(1);
    expect(rec.hook.snapshotText()).toBe('int main() { return 0; }\n');

    rec.dispose();
    expect(rec.hook.snapshotText()).toBeUndefined();
  });
});
