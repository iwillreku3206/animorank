import { Window } from '$lib/window';
import type { SolveWindowContext } from '../context.svelte';
import Submissions from './Submissions.window.svelte';

export class SubmissionsWindow extends Window<SolveWindowContext> {
  static title = 'Submissions';
  static closeable = false;
  constructor(context: SolveWindowContext) {
    super(
      {
        title: SubmissionsWindow.title,
        closable: SubmissionsWindow.closeable,
        context
      },
      Submissions
    );
  }
}
