import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SolveWindowContext } from './context.svelte';
import { runTestCases, submit, type TestRunResponse } from '$lib/practiceSession/api';
import { Problem } from '$lib/problem';
import { ClientPracticeSession } from '$lib/practiceSession/clientPracticeSession';
import type { Problem as ProblemModel, PracticeSession as PracticeSessionModel } from '$lib/zenstack/models';
import type { User } from '@auth/sveltekit';

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

const makeContext = (savedCode: Record<string, string>) => {
  const { problem, practiceSession } = makeSession(savedCode);
  return new SolveWindowContext({ problem, practiceSession, language: 'c' });
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
    it('stay addressable in the code the editor opens with', () => {
      const context = makeContext(savedCode);

      expect(context.slots).toHaveLength(1);
      for (const slot of context.slots) {
        expect(readRange(context.editorState.code, slot.initialRange)).toBe(
          context.editorState.codeSections[slot.label]
        );
      }
    });
  });

  it('seeds the code sections from the saved state', () => {
    const context = makeContext({ code: '  puts("hi");' });
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
    const context = makeContext({ code: '  puts("hi");' });

    await context.submit();

    expect(context.editorState.locked).toBe(false);
    expect(context.testSubmitted).toBe(success);
  });

  it('drops the solved panel when the student runs again', async () => {
    vi.mocked(submit).mockResolvedValue(result(true));
    vi.mocked(runTestCases).mockResolvedValue(result(false));
    const context = makeContext({ code: '  puts("hi");' });

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
    const context = new SolveWindowContext({ problem, practiceSession, language: 'c' });

    context.editorState.codeSections = { code: '  puts("second");' };
    await context.forceSave();
    expect(context.saveState).toBe('saved');

    const rebuilt = new SolveWindowContext({ problem, practiceSession, language: 'c' });
    expect(rebuilt.editorState.codeSections).toEqual({ code: '  puts("second");' });
    expect(rebuilt.editorState.code).toContain('  puts("second");');
  });

  it('records what was sent, not what was typed while the request was in flight', async () => {
    const { problem, practiceSession } = makeSession({ code: '  puts("first");' });
    const context = new SolveWindowContext({ problem, practiceSession, language: 'c' });

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
    const context = new SolveWindowContext({ problem, practiceSession, language: 'c' });

    context.editorState.codeSections = { code: '  puts("second");' };
    await context.forceSave();

    expect(context.saveState).toBe('error');
    expect(practiceSession.getPreviousState().code).toEqual({ code: '  puts("first");' });
  });
});
