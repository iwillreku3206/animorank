import { Window } from '$lib/window';
import type { ProblemEditorWindowContext } from './context.svelte';
import StarterCode from './StarterCode.window.svelte';

export class StarterCodeWindow extends Window<ProblemEditorWindowContext> {
  static title = 'Starter Code';
  static closeable = false;
  constructor(context: ProblemEditorWindowContext) {
    super(
      {
        title: StarterCodeWindow.title,
        closable: StarterCodeWindow.closeable,
        context
      },
      StarterCode
    );
  }
}
