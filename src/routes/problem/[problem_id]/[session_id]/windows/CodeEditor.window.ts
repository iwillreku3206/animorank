import { Window } from '$lib/window';
import type { SolveWindowContext } from '../context.svelte';
import CodeEditor from './CodeEditor.window.svelte';

export class CodeEditorWindow extends Window<SolveWindowContext> {
  static title = 'Code Editor';
  static closeable = false;
  constructor(context: SolveWindowContext) {
    super(
      {
        title: CodeEditorWindow.title,
        closable: CodeEditorWindow.closeable,
        context
      },
      CodeEditor
    );
  }
}
