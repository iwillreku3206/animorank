import { ServiceRegistry } from '$lib/services/registry';
import type { Window } from '$lib/window/index';
import type { ProblemEditorWindowContext } from './context.svelte';
import { ProblemMetadataWindow } from './ProblemMetadata.window';
import { StarterCodeWindow } from './StarterCode.window';
import { TagsWindow } from './Tags.window';

export class ProblemEditorWindowRegistry extends ServiceRegistry<
  Window<ProblemEditorWindowContext>,
  [context: ProblemEditorWindowContext],
  {
    title: string;
    closeable: boolean;
  }
> {
  constructor() {
    super();

    this.register('metadata', ProblemMetadataWindow);
    this.register('starter_code', StarterCodeWindow);
    this.register('tags', TagsWindow);
  }
}
