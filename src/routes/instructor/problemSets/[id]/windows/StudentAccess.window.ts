import { Window } from '$lib/window';
import type { ProblemSetEditorWindowContext } from '../context.svelte';
import StudentAccess from './StudentAccess.window.svelte';

export class StudentAccessWindow extends Window<ProblemSetEditorWindowContext> {
  static title = 'Student Access';
  static closeable = false;
  constructor(context: ProblemSetEditorWindowContext) {
    super(
      {
        title: StudentAccessWindow.title,
        closable: StudentAccessWindow.closeable,
        context
      },
      StudentAccess
    );
  }
}
