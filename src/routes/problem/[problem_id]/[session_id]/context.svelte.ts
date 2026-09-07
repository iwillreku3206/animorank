import type { AddPanelPositionOptions } from 'dockview-core';
import { AutoSave, type AutoSaveState } from '$lib/utils/autosave.svelte';
import type { Problem, Slot } from '$lib/problem';
import type { ClientPracticeSession } from '$lib/practiceSession/clientPracticeSession';
import {
  runTestCases,
  submit,
  runCustomInput,
  type CustomRunResponse,
  type TestRunResponse
} from '$lib/practiceSession/api';

/** Opens (or focuses) a window in the dockview, optionally placing it. */
export type OpenWindow = (_key: string, _positions?: AddPanelPositionOptions | AddPanelPositionOptions[]) => void;

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
  public readonly slots: Slot[];
  public readonly editorState: SolveEditorState;

  public testCaseResults: TestRunResponse = $state({ results: [], success: false });
  public lastTestType: 'run' | 'submit' = $state('run');
  public selectedTest: number = $state(-1);
  public testSubmitted: boolean = $state(false);
  public customRunLoading: boolean = $state(false);
  public customRunResult: CustomRunResponse | null = $state(null);

  private readonly autosave: AutoSave<Record<string, string>>;

  /**
   * Opens (or focuses) a window in the dockview. Wired by the page once the
   * window manager is available.
   */
  public openWindow: OpenWindow = () => {};

  constructor(initial: SolveWindowContextInitial) {
    this.problem = initial.problem;
    this.practiceSession = initial.practiceSession;
    this.language = initial.language;
    this.useSlots = initial.problem.uses_slots;

    const previousCode = initial.practiceSession.previousCode;
    this.slots = previousCode.sections.map((section) => section.slot);
    this.editorState = new SolveEditorState({
      code: previousCode.fullCode,
      sections: Object.fromEntries(previousCode.sections.map((section) => [section.slot.label, section.code]))
    });
    this.autosave = new AutoSave(() => this.saveCode(), $state.snapshot(this.editorState.codeSections));
  }

  /** The current autosave state, for the editor status bar. */
  public get saveState(): AutoSaveState {
    return this.autosave.state;
  }

  /** Queue a debounced save. Call whenever the code sections change. */
  public scheduleSave(): void {
    this.autosave.save($state.snapshot(this.editorState.codeSections));
  }

  /** Persist immediately, bypassing the debounce (Ctrl+S, run, submit). */
  public forceSave(): Promise<void> {
    return this.autosave.forceSave($state.snapshot(this.editorState.codeSections));
  }

  public async run(): Promise<void> {
    this.editorState.locked = true;
    await this.forceSave();
    const results = await runTestCases(this.practiceSession.id, this.problem);
    this.testCaseResults = results;
    this.lastTestType = 'run';
    this.selectedTest = results.results.length > 0 ? 0 : -1;
    this.editorState.locked = false;
    this.openWindow('test_cases', { direction: 'below', referencePanel: 'code_editor' });
  }

  public async submit(): Promise<void> {
    this.editorState.locked = true;
    await this.forceSave();
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
    this.openWindow('test_cases', { direction: 'below', referencePanel: 'code_editor' });
  }

  public async customRun(stdin: string): Promise<void> {
    this.customRunLoading = true;
    this.customRunResult = null;
    await this.forceSave();
    this.customRunResult = await runCustomInput(this.practiceSession.id, stdin);
    this.customRunLoading = false;
  }

  private async saveCode(): Promise<void> {
    const response = await fetch(`/api/practice-session/${this.practiceSession.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        code: $state.snapshot(this.editorState.codeSections)
      }),
      headers: { 'content-type': 'application/json' }
    });
    // `fetch` only rejects on network failure, so a 4xx/5xx has to be raised by
    // hand or the autosave would report a failed save as 'saved'.
    if (!response.ok) {
      throw new Error(`Failed to save code: ${response.status} ${response.statusText}`);
    }
  }
}
