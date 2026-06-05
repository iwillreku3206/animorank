import { Window } from '$lib/window';
import type { ProblemEditorWindowContext } from '../context.svelte';
import TestCases from './TestCases.window.svelte';

export class TestCasesWindow extends Window<ProblemEditorWindowContext> {
  static title = 'Test Cases';
  static closeable = false;
  constructor(context: ProblemEditorWindowContext) {
    super(
      {
        title: TestCasesWindow.title,
        closable: TestCasesWindow.closeable,
        context
      },
      TestCases
    );
  }
}
