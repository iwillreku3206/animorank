import { Window } from '$lib/window';
import type { SolveWindowContext } from '../context.svelte';
import ProblemInfo from './ProblemInfo.window.svelte';

export class ProblemInfoWindow extends Window<SolveWindowContext> {
  static title = 'Problem Info';
  static closeable = false;
  constructor(context: SolveWindowContext) {
    super(
      {
        title: ProblemInfoWindow.title,
        closable: ProblemInfoWindow.closeable,
        context
      },
      ProblemInfo
    );
  }
}
