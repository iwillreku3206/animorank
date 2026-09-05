import { Window } from '$lib/window';
import type { SolveWindowContext } from '../context.svelte';
import TestCases from './TestCases.window.svelte';

export class TestCasesWindow extends Window<SolveWindowContext> {
  static title = 'Test Cases';
  static closeable = false;
  constructor(context: SolveWindowContext) {
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
