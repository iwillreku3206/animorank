import type { AddPanelPositionOptions } from 'dockview-core';
import type { Problem } from '$lib/problem';
import type { ClientPracticeSession } from '$lib/practiceSession/clientPracticeSession';
import {
  runTestCases,
  submit,
  runCustomInput,
  type CustomRunResponse,
  type TestRunResponse
} from '$lib/practiceSession/api';

/** Opens (or focuses) a window in the dockview, optionally placing it. */
export type OpenWindow = (
  _key: string,
  _positions?: AddPanelPositionOptions | AddPanelPositionOptions[]
) => Promise<unknown>;

export interface SolveWindowContextInitial {
  problem: Problem;
  practiceSession: ClientPracticeSession;
  language: string;
}

/**
 * The mutable editor state of the solve view: the code, its per-slot sections
 * and the run lock. The problem itself is read-only on the context.
 */
export class SolveEditorState {
  public code: string = $state('');
  public codeSections: Record<string, string> = $state({});
  public locked: boolean = $state(false);

  constructor(initial: { code: string; sections: Record<string, string> }) {
    this.code = initial.code;
    this.codeSections = initial.sections;
  }
}

export class SolveWindowContext {
  public readonly problem: Problem;
  public readonly practiceSession: ClientPracticeSession;
  public readonly language: string;
  public readonly useSlots: boolean;
  public readonly editorState: SolveEditorState;

  public testCaseResults: TestRunResponse = $state({ results: [], success: false });
  public lastTestType: 'run' | 'submit' = $state('run');
  public selectedTest: number = $state(-1);
  public testSubmitted: boolean = $state(false);
  public customRunLoading: boolean = $state(false);
  public customRunResult: CustomRunResponse | null = $state(null);

  /**
   * Opens (or focuses) a window in the dockview. Wired by the page once the
   * window manager is available.
   */
  public openWindow: OpenWindow = async () => {};

  constructor(initial: SolveWindowContextInitial) {
    this.problem = initial.problem;
    this.practiceSession = initial.practiceSession;
    this.language = initial.language;
    this.useSlots = initial.problem.uses_slots;
    this.editorState = new SolveEditorState({
      code: initial.practiceSession.previousCode.fullCode,
      sections: Object.fromEntries(
        initial.practiceSession.previousCode.sections.map((section) => [section.slot.label, section.code])
      )
    });
  }

  public async run(): Promise<void> {
    this.editorState.locked = true;
    await this.saveCode();
    const results = await runTestCases(this.practiceSession.id, this.problem);
    this.testCaseResults = results;
    this.lastTestType = 'run';
    this.selectedTest = results.results.length > 0 ? 0 : -1;
    this.editorState.locked = false;
    await this.openWindow('test_cases', { direction: 'below', referencePanel: 'code_editor' });
  }

  public async submit(): Promise<void> {
    this.editorState.locked = true;
    await this.saveCode();
    const results = await submit(this.practiceSession.id, this.problem);
    this.testCaseResults = results;
    this.lastTestType = 'submit';

    // success is computed server-side over all tests, including hidden ones
    if (results.success) {
      this.testSubmitted = true;
    } else {
      this.selectedTest = results.results.length > 0 ? 0 : -1;
      this.editorState.locked = false;
    }
    await this.openWindow('test_cases', { direction: 'below', referencePanel: 'code_editor' });
  }

  public async customRun(stdin: string): Promise<void> {
    this.customRunLoading = true;
    this.customRunResult = null;
    await this.saveCode();
    this.customRunResult = await runCustomInput(this.practiceSession.id, stdin);
    this.customRunLoading = false;
  }

  private async saveCode(): Promise<void> {
    await fetch(`/api/practice-session/${this.practiceSession.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        code: $state.snapshot(this.editorState.codeSections)
      }),
      headers: { 'content-type': 'application/json' }
    });
  }
}
