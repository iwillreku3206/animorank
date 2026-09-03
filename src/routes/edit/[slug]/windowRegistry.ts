import { WindowRegistry } from '$lib/window/windowRegistry';
import type { ProblemEditorWindowContext } from './context.svelte';
import { ProblemMetadataWindow } from './windows/ProblemMetadata.window';
import { StarterCodeWindow } from './windows/StarterCode.window';
import { FunctionsWindow } from './windows/Functions.window';
import { PropertiesWindow } from './windows/Properties.window';
import { TestCasesWindow } from './windows/TestCases.window';

export class ProblemEditorWindowRegistry extends WindowRegistry<ProblemEditorWindowContext> {
  public id = 'window.problem_editor';

  constructor() {
    super();

    this.register('metadata', ProblemMetadataWindow);
    this.register('functions', FunctionsWindow);
    this.register('starter_code', StarterCodeWindow);
    this.register('properties', PropertiesWindow);
    this.register('test_cases', TestCasesWindow);
  }
}
