import type { ExecutionEvent } from "$lib/codeExecutor/executionHook";
import type { Subscribable } from "$lib/utils/subscription";
import type { editor } from "monaco-editor";
import { TelemetryHook, type Entry } from "./telemetryHook";
import type { TextEvent } from "./types/textEvent";
import type { monaco } from "$lib/monaco";

const reasonMap: Record<monaco.editor.CursorChangeReason, TextEvent['type']> = {
  "0": "userInput",
  "1": "reset",
  "2": "reset",
  "3": "userInput",
  "4": "paste",
  "5": "undo",
  "6": "redo"
}

export class TextInputHook extends TelemetryHook {

  public monacoHook(monaco: editor.IStandaloneCodeEditor): () => void {
    let eventQueue: Entry<Partial<TextEvent>>[] = []
    let prevText: string = monaco.getModel()?.getLinesContent().join('\n') || ''

    const reasonHook = monaco.onDidChangeCursorPosition((e) => {
      const event = eventQueue.shift()
      if (!event) return
      event.data.type = reasonMap[e.reason]

      this.addEntry(event)
    })
    const changeHook = monaco.onDidChangeModelContent(e => {
      e.changes.forEach(({ rangeLength, rangeOffset, text }) => {
        const old = prevText.substring(rangeOffset, rangeOffset + rangeLength)
        console.log(old)
        eventQueue.push({ type: 'TEXT_MODIFIED', data: { old, offset: rangeOffset, new: text } })
        prevText = monaco.getModel()?.getLinesContent().join('\n') || ''
      })
    })

    return () => {
      reasonHook.dispose()
      changeHook.dispose()
    }

  }
  public windowHook(_window: Window): () => void {
    return () => { }
  }
  public executionHook(_executionObservable: Subscribable<ExecutionEvent>): () => void {
    return () => { }
  }
}
