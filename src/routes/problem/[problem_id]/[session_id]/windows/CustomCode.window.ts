import { Window } from '$lib/window';
import type { SolveWindowContext } from '../context.svelte';
import CustomCode from './CustomCode.window.svelte';

export class CustomCodeWindow extends Window<SolveWindowContext> {
  static title = 'Custom Input';
  static closeable = false;
  constructor(context: SolveWindowContext) {
    super(
      {
        title: CustomCodeWindow.title,
        closable: CustomCodeWindow.closeable,
        context
      },
      CustomCode
    );
  }
}
