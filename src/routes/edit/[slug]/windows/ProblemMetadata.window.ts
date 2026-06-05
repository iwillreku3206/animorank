import { Window } from '$lib/window';
import type { ProblemEditorWindowContext } from '../context.svelte';
import ProblemMetadata from './ProblemMetadata.window.svelte';

export class ProblemMetadataWindow extends Window<ProblemEditorWindowContext> {
  static title = 'Metadata';
  static closeable = false;
  constructor(context: ProblemEditorWindowContext) {
    super(
      {
        title: ProblemMetadataWindow.title,
        closable: ProblemMetadataWindow.closeable,
        context
      },
      ProblemMetadata
    );
  }
}
