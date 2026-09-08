import { Window } from '$lib/window';
import type { ProblemSetEditorWindowContext } from '../context.svelte';
import General from './General.window.svelte';

export class GeneralWindow extends Window<ProblemSetEditorWindowContext> {
  static title = 'General';
  static closeable = false;
  constructor(context: ProblemSetEditorWindowContext) {
    super(
      {
        title: GeneralWindow.title,
        closable: GeneralWindow.closeable,
        context
      },
      General
    );
  }
}
