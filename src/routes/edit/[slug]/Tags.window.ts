import { Window } from '$lib/window';
import type { ProblemEditorWindowContext } from './context.svelte';
import Tags from './Tags.window.svelte';

export class TagsWindow extends Window<ProblemEditorWindowContext> {
  static title = 'Tags';
  static closeable = true;
  constructor(context: ProblemEditorWindowContext) {
    super(
      {
        title: TagsWindow.title,
        closable: TagsWindow.closeable,
        context
      },
      Tags
    );
  }
}
