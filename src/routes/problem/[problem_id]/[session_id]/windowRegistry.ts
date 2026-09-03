import { WindowRegistry } from '$lib/window/windowRegistry';
import type { SolveWindowContext } from './context.svelte';
import { ProblemInfoWindow } from './windows/ProblemInfo.window';
import { CodeEditorWindow } from './windows/CodeEditor.window';
import { TestCasesWindow } from './windows/TestCases.window';
import { CustomCodeWindow } from './windows/CustomCode.window';

export class SolveWindowRegistry extends WindowRegistry<SolveWindowContext> {
  public id = 'window.solve';

  constructor() {
    super();

    this.register('problem_info', ProblemInfoWindow);
    this.register('code_editor', CodeEditorWindow);
    this.register('test_cases', TestCasesWindow);
    this.register('custom_code', CustomCodeWindow);
  }
}
