import { describe, expect, it } from 'vitest';
import { SolveWindowContext } from './context.svelte';
import { Problem } from '$lib/problem';
import { ClientPracticeSession } from '$lib/practiceSession/clientPracticeSession';
import type { Problem as ProblemModel, PracticeSession as PracticeSessionModel } from '$lib/zenstack/models';
import type { User } from '@auth/sveltekit';

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

const makeContext = (savedCode: Record<string, string>) => {
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
