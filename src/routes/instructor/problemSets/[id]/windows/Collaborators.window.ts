import { Window } from '$lib/window';
import type { ProblemSetEditorWindowContext } from '../context.svelte';
import Collaborators from './Collaborators.window.svelte';

export class CollaboratorsWindow extends Window<ProblemSetEditorWindowContext> {
  static title = 'Collaborators';
  static closeable = false;
  constructor(context: ProblemSetEditorWindowContext) {
    super(
      {
        title: CollaboratorsWindow.title,
        closable: CollaboratorsWindow.closeable,
        context
      },
      Collaborators
    );
  }
}
