import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SolveWindowContext } from './context.svelte';
import { runTestCases, submit, type TestRunResponse } from '$lib/practiceSession/api';
import { Problem } from '$lib/problem';
import { ClientPracticeSession } from '$lib/practiceSession/clientPracticeSession';
import type { Problem as ProblemModel, PracticeSession as PracticeSessionModel } from '$lib/zenstack/models';
import type { User } from '@auth/sveltekit';
import { ClientRegistryProvider } from '$lib/registry/client';
import { TelemetryRegistry, TelemetryService } from '$lib/telemetry';

vi.mock('$lib/practiceSession/api', () => ({
  runTestCases: vi.fn(),
  submit: vi.fn(),
  runCustomInput: vi.fn()
}));

const STARTER_CODE = [
  '#include <stdio.h>',
  '',
  'int main() {',
  '%slot code%',
  '  // write your code here',
  '%endslot code%',
  '  return 0;',
  '}'
].join('\n');

const user = { id: 'student-1' } as User;

const makeSession = (savedCode: Record<string, string>) => {
  const problem = new Problem({
    id: 'problem-1',
    name: 'Slots problem',
    description: '',
    starter_code: STARTER_CODE,
    visible: true,
    uses_slots: true,
    language: 'c',
    difficulty_id: null,
    subject_id: null,
    extension_data: {}
  } as unknown as ProblemModel);

  const practiceSession = new ClientPracticeSession(
    {
      id: 'session-1',
      problem_id: 'problem-1',
      student_id: 'student-1',
      done: false,
      previous_state: { code: savedCode, extensionData: {} }
    } as unknown as PracticeSessionModel,
    problem,
    user
  );

  return { problem, practiceSession };
};

const makeContext = async (savedCode: Record<string, string>) => {
  const { problem, practiceSession } = makeSession(savedCode);
  return SolveWindowContext.create({ problem, practiceSession, language: 'c' });
};

/**
 * Read a slot range out of the editor text the way the constrained editor does,
 * and fail the way it does: it throws on a range running past the end of a line
 * or past the last line, which drops every restriction along with the listener
 * that feeds autosave.
 */
const readRange = (code: string, [startLine, startCol, endLine, endCol]: [number, number, number, number]) => {
  const lines = code.split('\n');
  if (startLine > lines.length) throw new Error(`start line ${startLine} > ${lines.length} lines`);
  if (endLine > lines.length) throw new Error(`end line ${endLine} > ${lines.length} lines`);
  if (startCol > lines[startLine - 1].length + 1)
    throw new Error(`start column ${startCol} past end of line ${startLine}`);
  if (endCol > lines[endLine - 1].length + 1) throw new Error(`end column ${endCol} past end of line ${endLine}`);

  const selected = lines.slice(startLine - 1, endLine);
  selected[selected.length - 1] = selected[selected.length - 1].slice(0, endCol - 1);
  selected[0] = selected[0].slice(startCol - 1);
  return selected.join('\n');
};

// Regression: `slots` used to be read from `problem.getSlots()`, which parses the
// bare template, while the editor text came from `previousCode.fullCode`, which
// substitutes the student's saved code. The two only agree while the slots still
// hold their default content, so the first refresh after a save handed the
// constrained editor an out-of-bounds range -- leaving the whole file editable
// and autosave writing a stale snapshot.
describe('SolveWindowContext slot ranges', () => {
  describe.each([
    ['a fresh session', {}],
    ['a shorter single line', { code: '  int x = 5;' }],
    ['more lines than the default', { code: '  int x = 5;\n  printf("%d", x);' }],
    ['an emptied slot', { code: '' }],
    ['a longer line than the default', { code: '  printf("a rather long line indeed %d\\n", 1);' }]
  ])('with %s', (_label, savedCode) => {
    it('stay addressable in the code the editor opens with', async () => {
      const context = await makeContext(savedCode);

      expect(context.slots).toHaveLength(1);
      for (const slot of context.slots) {
        expect(readRange(context.editorState.code, slot.initialRange)).toBe(
          context.editorState.codeSections[slot.label]
        );
      }
    });
  });

  it('seeds the code sections from the saved state', async () => {
    const context = await makeContext({ code: '  puts("hi");' });
    expect(context.editorState.codeSections).toEqual({ code: '  puts("hi");' });
    expect(context.editorState.code).toContain('  puts("hi");');
  });
});

// Regression: a passing submit used to leave `locked` true for good, freezing
// the editor around the accepted solution. One pass marks the session done
// server-side and nothing ever unmarks it, so there is no credit to protect --
// students stay free to keep tweaking and re-submitting.
describe('SolveWindowContext submissions', () => {
  const result = (success: boolean) =>
    ({
      success,
      results: [{ success, testCaseInfo: { public: true } }]
    }) as unknown as TestRunResponse;

  beforeEach(() => {
    // The context force-saves before every run; the response only has to be ok.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it.each([
    ['passing', true],
    ['failing', false]
  ])('leaves the editor editable after a %s submit', async (_label, success) => {
    vi.mocked(submit).mockResolvedValue(result(success));
    const context = await makeContext({ code: '  puts("hi");' });

    await context.submit();

    expect(context.editorState.locked).toBe(false);
    expect(context.testSubmitted).toBe(success);
  });

  it('drops the solved panel when the student runs again', async () => {
    vi.mocked(submit).mockResolvedValue(result(true));
    vi.mocked(runTestCases).mockResolvedValue(result(false));
    const context = await makeContext({ code: '  puts("hi");' });

    await context.submit();
    expect(context.testSubmitted).toBe(true);

    await context.run();

    expect(context.testSubmitted).toBe(false);
    expect(context.lastTestType).toBe('run');
    expect(context.editorState.locked).toBe(false);
  });
});

// Regression: `previous_state` is captured when the page loads and used to stay
// frozen there for the life of the page. Anything that rebuilt the context from
// it afterwards -- a remount of the solve view when the viewport crossed the
// desktop breakpoint, a hot reload in dev -- reseeded the editor with the code
// as it stood on page load. A student could autosave successfully for an hour
// and still lose all of it the moment they zoomed the page.
describe('SolveWindowContext saved state', () => {
  const okResponse = { ok: true, status: 200, statusText: 'OK' };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('advances the session so a context rebuilt from it starts from the saved code', async () => {
    const { problem, practiceSession } = makeSession({ code: '  puts("first");' });
    const context = await SolveWindowContext.create({ problem, practiceSession, language: 'c' });

    context.editorState.codeSections = { code: '  puts("second");' };
    await context.forceSave();
    expect(context.saveState).toBe('saved');

    const rebuilt = await SolveWindowContext.create({ problem, practiceSession, language: 'c' });
    expect(rebuilt.editorState.codeSections).toEqual({ code: '  puts("second");' });
    expect(rebuilt.editorState.code).toContain('  puts("second");');
  });

  it('records what was sent, not what was typed while the request was in flight', async () => {
    const { problem, practiceSession } = makeSession({ code: '  puts("first");' });
    const context = await SolveWindowContext.create({ problem, practiceSession, language: 'c' });

    // Resolve the save only once a later keystroke has landed, so re-reading
    // the editor after the await would pick up code the server never saw.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        context.editorState.codeSections = { code: '  puts("third");' };
        return Promise.resolve(okResponse);
      })
    );

    context.editorState.codeSections = { code: '  puts("second");' };
    await context.forceSave();

    expect(practiceSession.getPreviousState().code).toEqual({ code: '  puts("second");' });
  });

  it('leaves the session untouched when the server rejects the save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' }));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { problem, practiceSession } = makeSession({ code: '  puts("first");' });
    const context = await SolveWindowContext.create({ problem, practiceSession, language: 'c' });

    context.editorState.codeSections = { code: '  puts("second");' };
    await context.forceSave();

    expect(context.saveState).toBe('error');
    expect(practiceSession.getPreviousState().code).toEqual({ code: '  puts("first");' });
  });
});

// Regression: an attempt that could not happen used to be indistinguishable
// from one that did. A failed save still graded, against the revision the
// server held; a failed run threw past `locked = false`, leaving the editor
// read-only behind a spinner that only a page reload cleared.
describe('SolveWindowContext failed attempts', () => {
  const result = (success: boolean) =>
    ({
      success,
      results: [{ success, testCaseInfo: { public: true } }]
    }) as unknown as TestRunResponse;

  const respondWith = (...statuses: number[]) => {
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: statuses[Math.min(call++, statuses.length - 1)] }))
    );
  };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it('does not grade a submit whose save failed', async () => {
    respondWith(500);
    const context = await makeContext({ code: '  puts("first");' });

    context.editorState.codeSections = { code: '  puts("second");' };
    await context.submit();

    expect(submit).not.toHaveBeenCalled();
    expect(context.runError).not.toBeNull();
    expect(context.editorState.locked).toBe(false);
  });

  it('does not run code whose save failed', async () => {
    respondWith(500);
    const context = await makeContext({ code: '  puts("first");' });

    context.editorState.codeSections = { code: '  puts("second");' };
    await context.run();

    expect(runTestCases).not.toHaveBeenCalled();
    expect(context.runError).not.toBeNull();
    expect(context.editorState.locked).toBe(false);
  });

  // A single failed save heals itself: the dedup baseline rolls back, so the
  // next attempt retries the write before grading.
  it('submits once a retry of the failed save lands', async () => {
    respondWith(500, 200);
    vi.mocked(submit).mockResolvedValue(result(true));
    const context = await makeContext({ code: '  puts("first");' });

    context.editorState.codeSections = { code: '  puts("second");' };
    await context.submit();
    expect(submit).not.toHaveBeenCalled();

    await context.submit();

    expect(submit).toHaveBeenCalledTimes(1);
    expect(context.runError).toBeNull();
  });

  // Regression: undoing back to the saved revision used to leave run and submit
  // permanently blocked. The failed write's result stayed on the autosave chain,
  // so every later attempt was told the code could not be saved -- about code
  // the server had held all along, and while the status bar read 'saved'.
  it('runs again once the code is undone back to what the server holds', async () => {
    // Only ever 500: a second write would fail too, so this passing proves no
    // second write was needed rather than that a retry happened to succeed.
    respondWith(500);
    vi.mocked(runTestCases).mockResolvedValue(result(true));
    const context = await makeContext({ code: '  puts("first");' });

    context.editorState.codeSections = { code: '  puts("second");' };
    await context.run();
    expect(runTestCases).not.toHaveBeenCalled();
    expect(context.runError).not.toBeNull();

    // The student undoes their change, putting the editor back to the revision
    // the page loaded with -- which the server has had since before the failure.
    context.editorState.codeSections = { code: '  puts("first");' };
    await context.run();

    expect(runTestCases).toHaveBeenCalledTimes(1);
    expect(context.runError).toBeNull();
    expect(context.editorState.locked).toBe(false);
  });

  it.each([
    ['run', (context: Awaited<ReturnType<typeof makeContext>>) => context.run(), runTestCases],
    ['submit', (context: Awaited<ReturnType<typeof makeContext>>) => context.submit(), submit]
  ])('unlocks the editor when the %s request fails', async (_label, attempt, api) => {
    respondWith(200);
    vi.mocked(api).mockRejectedValue(new Error('Could not reach the grader'));
    const context = await makeContext({ code: '  puts("hi");' });

    await attempt(context);

    expect(context.editorState.locked).toBe(false);
    expect(context.runError).toBe('Could not reach the grader');
  });
});

// A Submit whose grading stood but whose history row was lost. The server keeps
// the verdict rather than failing the request, so the only trace of the loss is
// `recorded` on the response -- without it the history panel refetches and shows
// a list quietly missing the attempt the student just watched run.
describe('SolveWindowContext submission recording', () => {
  const graded = (recorded?: boolean) =>
    ({
      success: true,
      results: [{ success: true, testCaseInfo: { public: true } }],
      ...(recorded !== undefined && { recorded })
    }) as unknown as TestRunResponse;

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('starts out assuming the history is complete', async () => {
    expect((await makeContext({ code: '  puts("hi");' })).lastSubmissionRecorded).toBe(true);
  });

  it('flags a submit the server could not record', async () => {
    vi.mocked(submit).mockResolvedValue(graded(false));
    const context = await makeContext({ code: '  puts("hi");' });

    await context.submit();

    expect(context.lastSubmissionRecorded).toBe(false);
    // The grading itself stood, so this is not a failed attempt: the results
    // are shown as usual and no error banner goes up.
    expect(context.runError).toBeNull();
    expect(context.testSubmitted).toBe(true);
    // Still bumped: the earlier rows are worth refreshing even though this
    // attempt is missing from them.
    expect(context.submissionsVersion).toBe(1);
  });

  it('leaves the flag alone for a submit that was recorded', async () => {
    vi.mocked(submit).mockResolvedValue(graded(true));
    const context = await makeContext({ code: '  puts("hi");' });

    await context.submit();

    expect(context.lastSubmissionRecorded).toBe(true);
  });

  it('treats a response with no recorded field as recorded', async () => {
    // An older server build never says. Only an explicit `false` is a report
    // that a row was lost, so silence must not raise the warning.
    vi.mocked(submit).mockResolvedValue(graded());
    const context = await makeContext({ code: '  puts("hi");' });

    await context.submit();

    expect(context.lastSubmissionRecorded).toBe(true);
  });

  it('clears the flag when a later submit records cleanly', async () => {
    const context = await makeContext({ code: '  puts("hi");' });

    vi.mocked(submit).mockResolvedValue(graded(false));
    await context.submit();
    expect(context.lastSubmissionRecorded).toBe(false);

    // The warning belongs to one attempt, not to the panel for the rest of the
    // session: a clean Submit afterwards has to take it back down.
    vi.mocked(submit).mockResolvedValue(graded(true));
    await context.submit();
    expect(context.lastSubmissionRecorded).toBe(true);
  });
});

describe('SolveWindowContext run error lifetime', () => {
  it('drops a standing error once the code changes', async () => {
    const context = await makeContext({ code: '  puts("hi");' });
    context.runError = 'Your latest changes could not be saved.';

    context.scheduleSave();

    // The error described an attempt on code that has since moved on. Left up,
    // it outlasts the problem it reported -- a student who reconnects and keeps
    // typing would go on reading that their work could not be saved.
    expect(context.runError).toBeNull();
  });
});
