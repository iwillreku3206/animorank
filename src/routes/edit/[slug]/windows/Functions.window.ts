import { Window } from '$lib/window';
import type { ProblemEditorWindowContext } from '../context.svelte';
import Functions from './Functions.window.svelte';

export class FunctionsWindow extends Window<ProblemEditorWindowContext> {
  static title = 'Functions';
  static closeable = false;
  constructor(context: ProblemEditorWindowContext) {
    super(
      {
        title: FunctionsWindow.title,
        closable: FunctionsWindow.closeable,
        context
      },
      Functions
    );
  }
}
