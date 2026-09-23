import { AutoSave, type AutoSaveState } from '$lib/utils/autosave.svelte';
import { ClientRegistryProvider } from '$lib/registry/client';
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
import type { AddPanelPositionOptions } from 'dockview-core';

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
  /**
   * The session's telemetry sink. Optional: {@link SolveWindowContext.create}
   * resolves it from the client registry when it is not supplied (the solve page
   * does not hold one yet; a test injects its own).
   */
  telemetry?: TelemetryService;
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
   * the start of the next attempt, by the next edit to the code, and by the
   * student dismissing it.
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
  /**
   * Whether the last Submit reached the student's history.
   *
   * The grading still stands when this is false -- the server keeps a verdict
   * it has already computed rather than failing the request over a lost
   * history row. But the panel refetches on every Submit, so without this it
   * would show a list quietly missing the attempt that just ran.
   */
  public lastSubmissionRecorded: boolean = $state(true);

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
  public openWindow: OpenWindow = async () => {};

  /**
   * Build a context for a solve page. The telemetry service is a client-registry
   * service rather than server load data, so it has to be resolved here — and
   * since that resolution is asynchronous, a page that needs the context before
   * it renders the dock builds it through this factory and gates on the result.
   * A caller that already holds a service (a test) passes it in `telemetry`
   * instead, which skips the registry lookup.
   */
  public static async create(initialValues: SolveWindowContextInitial): Promise<SolveWindowContext> {
    const telemetry =
      initialValues.telemetry ??
      (await ClientRegistryProvider.instance().getService(TelemetryService, initialValues.practiceSession.id));
    return new SolveWindowContext({ ...initialValues, telemetry });
  }

  private constructor(initial: SolveWindowContextInitial) {
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

    // The factory always resolves it; the optional input exists only so the
    // factory can accept a caller-supplied service.
    this.telemetry = initial.telemetry!;

    this.autosave = new AutoSave((code) => this.saveCode(code), $state.snapshot(this.editorState.codeSections));
  }

  /** The current autosave state, for the editor status bar. */
  public get saveState(): AutoSaveState {
    return this.autosave.state;
  }

  /** Queue a debounced save. Call whenever the code sections change. */
  public scheduleSave(): void {
    // The standing error described an attempt on code that has now changed, so
    // it no longer describes anything on screen. Leaving it up outlasts the
    // problem it reported -- a student who reconnects and carries on typing
    // would keep reading that their changes could not be saved.
    this.runError = null;
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
    this.lastSubmissionRecorded = true;
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
      // Absent means the server never said -- an older build, say. Only an
      // explicit `false` is a report that the row was lost.
      this.lastSubmissionRecorded = results.recorded !== false;
      // The server records the submission before it responds, so by here the new
      // row is durable and the history can safely refetch. Bumped even when the
      // row was lost: the earlier rows are still worth refreshing, and the
      // panel explains the gap rather than hiding it.
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
