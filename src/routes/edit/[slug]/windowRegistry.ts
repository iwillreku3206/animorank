import { WindowRegistry } from '$lib/window/windowRegistry';
import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
import type { ProblemEditorWindowContext } from './context.svelte';
import { ProblemMetadataWindow } from './windows/ProblemMetadata.window';
import { StarterCodeWindow } from './windows/StarterCode.window';
import { FunctionsWindow } from './windows/Functions.window';
import { PropertiesWindow } from './windows/Properties.window';
import { createTestCaseWindow, testCaseWindowId } from './windows/TestCases.window';

export class ProblemEditorWindowRegistry extends WindowRegistry<ProblemEditorWindowContext> {
  constructor() {
    super();

    this.register('metadata', ProblemMetadataWindow);
    this.register('functions', FunctionsWindow);
    this.register('starter_code', StarterCodeWindow);
    this.register('properties', PropertiesWindow);

    for (const type of TestCaseRegistry.instance().keys()) {
      this.register(testCaseWindowId(type), createTestCaseWindow(type));
    }
  }
}
