import type { Component } from 'svelte';
import { Window } from '$lib/window';
import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
import { GlobalRegistryProvider } from '$lib/registry/global';
import type { ProblemEditorWindowContext } from '../context.svelte';
import TestCaseList from './TestCases/TestCaseList.svelte';

/**
 * Panel id for a test case type's window. Every registered test case type
 * gets its own window, so the ids are derived rather than written out.
 */
export function testCaseWindowId(type: string): string {
  return `test_cases_${type}`;
}

/**
 * Build the window class for one test case type. The panels differ only by
 * which type they list, so they share `TestCaseList` and pass the type
 * through the window's extra props.
 *
 * Async because the type's display name comes from a registry lookup, which a
 * miss answers by loading the plugin that registers the type first; the window
 * is built through `registerLazy` so that load lands before its title is read.
 */
export async function createTestCaseWindow(type: string) {
  const title = (await GlobalRegistryProvider.instance().getRegistry(TestCaseRegistry).getStatic(type)).displayName;

  return class TestCaseTypeWindow extends Window<ProblemEditorWindowContext> {
    static title = title;
    static closeable = false;

    constructor(context: ProblemEditorWindowContext) {
      super(
        {
          title,
          closable: TestCaseTypeWindow.closeable,
          context,
          props: { type }
        },
        TestCaseList as unknown as Component<{ context: ProblemEditorWindowContext }>
      );
    }
  };
}
