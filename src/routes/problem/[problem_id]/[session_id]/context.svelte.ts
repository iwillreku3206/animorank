import type { AddPanelPositionOptions } from 'dockview-core';
import { AutoSave, type AutoSaveState } from '$lib/utils/autosave.svelte';
import { ClientServiceProvider } from '$lib/services/clientServiceProvider';
import { TelemetryService } from '$lib/telemetry/telemetryService';
import type { Problem, Slot } from '$lib/problem';
import type { ClientPracticeSession } from '$lib/practiceSession/clientPracticeSession';
import {
  runTestCases,
  submit,
  runCustomInput,
  type CustomRunResponse,
  type TestRunResponse
} from '$lib/practiceSession/api';

/**
 * Shown when an attempt is abandoned because the code could not be persisted.
 *
 * The server grades the revision it holds, so going ahead after a failed save
 * would report a verdict on code the student can see they did not write -- and
 * on submit, record that verdict in their history permanently.
 */
const unsavedMessage = (verb: string) =>
  `Your latest changes could not be saved, so they were not ${verb}. Check your connection and try again.`;

/** The message a failed attempt should show, for a rejection that isn't an Error. */
const messageOf = (error: unknown, fallback: string): string => (error instanceof Error ? error.message : fallback);

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
  /**
   * Why the last run, submit or custom run could not be carried out. Cleared at
   * the start of the next attempt, and by the student dismissing it.
   *
   * Distinct from a failing test: this is the attempt not happening at all, so
   * there is no result panel to put it in.
   */
  public runError: string | null = $state(null);
  /**
   * Bumped once per Submit. The submissions window watches this so a new
   * attempt shows up in the history without the student reopening the panel.
   */
  public submissionsVersion: number = $state(0);

  private readonly autosave: AutoSave<Record<string, string>>;

  /**
   * The telemetry sink for this session, shared by everything that attaches
   * hooks or flushes (the editor window, the save path). One instance per
   * page, so it is bound to this session's id.
   */
  public readonly telemetry: TelemetryService;

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
    this.telemetry = ClientServiceProvider.instance().getService(TelemetryService, initial.practiceSession.id);
    this.autosave = new AutoSave((code) => this.saveCode(code), $state.snapshot(this.editorState.codeSections));
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
  public forceSave(): Promise<boolean> {
    return this.autosave.forceSave($state.snapshot(this.editorState.codeSections));
  }

  public async run(): Promise<void> {
    this.runError = null;
    this.editorState.locked = true;
    try {
      if (!(await this.forceSave())) {
        this.runError = unsavedMessage('run');
        return;
      }
      const results = await runTestCases(this.practiceSession.id, this.problem);
      this.testCaseResults = results;
      this.lastTestType = 'run';
      this.testSubmitted = false;
      this.selectedTest = results.results.length > 0 ? 0 : -1;
      this.openWindow('test_cases', { direction: 'below', referencePanel: 'code_editor' });
    } catch (error) {
      this.runError = messageOf(error, 'Could not run your code.');
    } finally {
      // Released in `finally` rather than on the success path: a throw anywhere
      // above would otherwise leave the editor read-only behind a spinner that
      // never clears, with no way back but a page reload.
      this.editorState.locked = false;
    }
  }

  public async submit(): Promise<void> {
    this.runError = null;
    this.editorState.locked = true;
    try {
      if (!(await this.forceSave())) {
        this.runError = unsavedMessage('submitted');
        return;
      }
      const results = await submit(this.practiceSession.id, this.problem);
      this.testCaseResults = results;
      this.lastTestType = 'submit';

      // success is computed server-side over all tests, including hidden ones
      this.testSubmitted = results.success;
      this.selectedTest = results.results.length > 0 ? 0 : -1;
      // The server records the submission before it responds, so by here the new
      // row is durable and the history can safely refetch.
      this.submissionsVersion += 1;
      this.openWindow('test_cases', { direction: 'below', referencePanel: 'code_editor' });
    } catch (error) {
      this.runError = messageOf(error, 'Could not submit your code.');
    } finally {
      this.editorState.locked = false;
    }
  }

  public async customRun(stdin: string): Promise<void> {
    this.runError = null;
    this.customRunLoading = true;
    this.customRunResult = null;
    try {
      if (!(await this.forceSave())) {
        this.runError = unsavedMessage('run');
        return;
      }
      this.customRunResult = await runCustomInput(this.practiceSession.id, stdin);
    } catch (error) {
      this.runError = messageOf(error, 'Could not run your code.');
    } finally {
      this.customRunLoading = false;
    }
  }

  /**
   * Writes one revision of the code. `code` is the snapshot the autosave
   * queued, not a fresh read of the editor -- re-reading here would send
   * whatever the student had typed by the time this write reached the front of
   * the queue, and the session would be credited with code the autosave never
   * accounted for.
   */
  private async saveCode(code: Record<string, string>): Promise<void> {
    const response = await fetch(`/api/practice-session/${this.practiceSession.id}`, {
      method: 'PUT',
      body: JSON.stringify({ code }),
      headers: { 'content-type': 'application/json' }
    });
    // `fetch` only rejects on network failure, so a 4xx/5xx has to be raised by
    // hand or the autosave would report a failed save as 'saved'.
    if (!response.ok) {
      throw new Error(`Failed to save code: ${response.status} ${response.statusText}`);
    }
    // The server holds this code now, so advance the client's copy of the
    // session to match. Without this the model keeps the page-load state
    // forever, and anything reseeding from it later reverts the student's work.
    this.practiceSession.recordSavedCode(code);
    // The session state is persisted: flush collated telemetry into the
    // session history alongside it, instead of on its own timer.
    void this.telemetry.flush();
  }
}
