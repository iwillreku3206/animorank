import { ServiceRegistry } from '$lib/services/registry';
import type { Window } from '$lib/window/index';
import type { ProblemEditorWindowContext } from './context.svelte';
import { ProblemMetadataWindow } from './windows/ProblemMetadata.window';
import { StarterCodeWindow } from './windows/StarterCode.window';
import { PropertiesWindow } from './windows/Properties.window';
import { TestCasesWindow } from './windows/TestCases.window';

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
    this.register('properties', PropertiesWindow);
    this.register('test_cases', TestCasesWindow);
  }
}
