import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProblemSetEditorWindowContext, type InitialValues } from './context.svelte';
import { addProblem, deleteProblem, saveProblem, saveProblemSet } from './api';

vi.mock('./api', () => ({
  saveProblemSet: vi.fn(),
  addProblem: vi.fn(),
  deleteProblem: vi.fn(),
  saveProblem: vi.fn()
}));

const initialValues = (): InitialValues => ({
  problemSet: {
    id: 'ps-1',
    title: 'Loops',
    description: 'Practice loops.',
    auto_accept: false,
    is_global: false,
    subject_id: null,
    difficulty_id: null
  },
  problems: [
    { id: 'p-1', name: 'First', visible: true, difficulty_id: null, topics: [] },
    { id: 'p-2', name: 'Second', visible: true, difficulty_id: null, topics: [] }
  ],
  topics: ['topic-a'],
  collaborators: ['user-1'],
  tags: []
});

beforeEach(() => {
  vi.mocked(saveProblemSet).mockReset().mockResolvedValue(undefined);
  vi.mocked(saveProblem).mockReset().mockResolvedValue(undefined);
  vi.mocked(deleteProblem).mockReset().mockResolvedValue(undefined);
  vi.mocked(addProblem).mockReset();
});

describe('ProblemSetEditorWindowContext autosave', () => {
  it('sends the scalar fields and the topic ids together', async () => {
    const context = new ProblemSetEditorWindowContext(initialValues());

    context.problemSet.title = 'Loops and arrays';
    context.topics = ['topic-a', 'topic-b'];
    await context.forceSave();

    expect(saveProblemSet).toHaveBeenCalledWith('ps-1', {
      title: 'Loops and arrays',
      description: 'Practice loops.',
      auto_accept: false,
      is_global: false,
      subject_id: null,
      difficulty_id: null,
      topic_ids: ['topic-a', 'topic-b']
    });

    context.cleanup();
  });

  it('reports a rejected save as an error rather than as saved', async () => {
    const context = new ProblemSetEditorWindowContext(initialValues());
    vi.mocked(saveProblemSet).mockRejectedValue(new Error('403'));

    context.problemSet.title = 'Changed';
    await context.forceSave();

    // The first draft of AutoSave overwrote 'error' with 'saved' in a `finally`,
    // so a failed save looked persisted. This is that regression.
    expect(context.autosaveStatus).toBe('error');

    context.cleanup();
  });

  it('reports a successful save as saved', async () => {
    const context = new ProblemSetEditorWindowContext(initialValues());

    context.problemSet.title = 'Changed';
    await context.forceSave();

    expect(context.autosaveStatus).toBe('saved');

    context.cleanup();
  });

  it('does not call the API when nothing changed', async () => {
    const context = new ProblemSetEditorWindowContext(initialValues());

    await context.forceSave();

    expect(saveProblemSet).not.toHaveBeenCalled();

    context.cleanup();
  });
});

describe('ProblemSetEditorWindowContext problem list', () => {
  it('appends a newly created problem', async () => {
    const context = new ProblemSetEditorWindowContext(initialValues());
    vi.mocked(addProblem).mockResolvedValue({
      id: 'p-3',
      name: 'New Problem',
      visible: true,
      difficulty_id: null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await context.addProblem();

    expect(context.problems).toHaveLength(3);
    expect(context.problems[2]).toEqual({
      id: 'p-3',
      name: 'New Problem',
      visible: true,
      difficulty_id: null,
      topics: []
    });

    context.cleanup();
  });

  it('removes a deleted problem', async () => {
    const context = new ProblemSetEditorWindowContext(initialValues());

    await context.deleteProblem('p-1');

    expect(deleteProblem).toHaveBeenCalledWith('p-1');
    expect(context.problems.map((p) => p.id)).toEqual(['p-2']);

    context.cleanup();
  });
});

describe('ProblemSetEditorWindowContext.setProblemVisible', () => {
  it('writes the new visibility through', async () => {
    const context = new ProblemSetEditorWindowContext(initialValues());

    await context.setProblemVisible('p-1', false);

    expect(saveProblem).toHaveBeenCalledWith('p-1', { visible: false });
    expect(context.problems[0].visible).toBe(false);

    context.cleanup();
  });

  it('rolls the optimistic update back when the write fails', async () => {
    const context = new ProblemSetEditorWindowContext(initialValues());
    vi.mocked(saveProblem).mockRejectedValue(new Error('500'));

    await expect(context.setProblemVisible('p-1', false)).rejects.toThrow('500');
    expect(context.problems[0].visible).toBe(true);

    context.cleanup();
  });
});
