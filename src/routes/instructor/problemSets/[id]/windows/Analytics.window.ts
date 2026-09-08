import { Window } from '$lib/window';
import type { ProblemSetEditorWindowContext } from '../context.svelte';
import Analytics from './Analytics.window.svelte';

export class AnalyticsWindow extends Window<ProblemSetEditorWindowContext> {
  static title = 'Analytics';
  static closeable = false;
  constructor(context: ProblemSetEditorWindowContext) {
    super(
      {
        title: AnalyticsWindow.title,
        closable: AnalyticsWindow.closeable,
        context
      },
      Analytics
    );
  }
}
