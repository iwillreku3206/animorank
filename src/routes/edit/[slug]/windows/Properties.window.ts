import { Window } from '$lib/window';
import type { ProblemEditorWindowContext } from '../context.svelte';
import Properties from './Properties.window.svelte';

export class PropertiesWindow extends Window<ProblemEditorWindowContext> {
  static title = 'Properties';
  static closeable = false;
  constructor(context: ProblemEditorWindowContext) {
    super(
      {
        title: PropertiesWindow.title,
        closable: PropertiesWindow.closeable,
        context
      },
      Properties
    );
  }
}
