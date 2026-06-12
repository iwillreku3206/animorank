import { ServiceRegistry } from '$lib/services/registry';
import type { Window } from '$lib/window/index';
import type { ProblemSetEditorWindowContext } from './context.svelte';

export class ProblemSetEditorWindowRegistry extends ServiceRegistry<
  Window<ProblemSetEditorWindowContext>,
  [context: ProblemSetEditorWindowContext],
  {
    title: string;
    closeable: boolean;
  }
> {
  constructor() {
    super();
  }
}
