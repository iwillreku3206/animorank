import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProblemSetEditorWindowContext, type InitialValues } from './context.svelte';
import {
  addCollaborator,
  addProblem,
  addSubscriber,
  deleteProblem,
  removeCollaborator,
  removeSubscriber,
  saveProblem,
  saveProblemSet
} from './api';

vi.mock('./api', () => ({
  saveProblemSet: vi.fn(),
  addProblem: vi.fn(),
  deleteProblem: vi.fn(),
  saveProblem: vi.fn(),
  addSubscriber: vi.fn(),
  removeSubscriber: vi.fn(),
  addCollaborator: vi.fn(),
  removeCollaborator: vi.fn()
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
  collaborators: [{ id: 'user-1', name: 'Grace', email: 'grace@example.com' }],
  subscribers: [],
  tags: []
});

beforeEach(() => {
  vi.mocked(saveProblemSet).mockReset().mockResolvedValue(undefined);
  vi.mocked(saveProblem).mockReset().mockResolvedValue(undefined);
  vi.mocked(deleteProblem).mockReset().mockResolvedValue(undefined);
  vi.mocked(addProblem).mockReset();
  vi.mocked(addSubscriber).mockReset();
  vi.mocked(removeSubscriber).mockReset().mockResolvedValue(undefined);
  vi.mocked(addCollaborator).mockReset();
  vi.mocked(removeCollaborator).mockReset().mockResolvedValue(undefined);
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

  it('sends the queued snapshot rather than whatever is current when the write runs', async () => {
    const context = new ProblemSetEditorWindowContext(initialValues());

    // Hold the first write open so the second has to queue behind it. The
    // instructor keeps typing while it waits its turn, and re-reading the draft
    // at execution time would send that later text under the queued write's
    // baseline -- leaving the autosave recording a revision the server never
    // received, which is what lets a revert to it dedup away and never land.
    let releaseFirst!: () => void;
    const firstInFlight = new Promise<void>((resolve) => (releaseFirst = resolve));
    vi.mocked(saveProblemSet)
      .mockImplementationOnce(() => firstInFlight)
      .mockImplementation(() => Promise.resolve(undefined));

    context.problemSet.title = 'First';
    const first = context.forceSave();

    context.problemSet.title = 'Queued for the write';
    const second = context.forceSave();

    context.problemSet.title = 'Typed while the queue drained';

    releaseFirst();
    await Promise.all([first, second]);

    expect(saveProblemSet).toHaveBeenNthCalledWith(
      2,
      'ps-1',
      expect.objectContaining({ title: 'Queued for the write' })
    );

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

describe('ProblemSetEditorWindowContext subscribers', () => {
  it('inserts an added subscriber in email order', async () => {
    const context = new ProblemSetEditorWindowContext({
      ...initialValues(),
      subscribers: [{ id: 's-1', name: 'Ada', email: 'ada@example.com' }]
    });
    vi.mocked(addSubscriber).mockResolvedValue({ id: 's-2', name: 'Zoe', email: 'zoe@example.com' });

    await context.addSubscriber('zoe@example.com');

    expect(context.subscribers.map((subscriber) => subscriber.email)).toEqual(['ada@example.com', 'zoe@example.com']);
  });

  it('surfaces the server sentence when the address is not a registered student', async () => {
    const context = new ProblemSetEditorWindowContext(initialValues());
    vi.mocked(addSubscriber).mockRejectedValue(
      new Error('Adding the subscriber failed: No account is registered with that email address.')
    );

    await expect(context.addSubscriber('nobody@example.com')).rejects.toThrow(/No account is registered/);
    expect(context.subscribers).toEqual([]);
  });

  it('keeps the list unchanged when the removal is refused', async () => {
    const context = new ProblemSetEditorWindowContext({
      ...initialValues(),
      subscribers: [{ id: 's-1', name: 'Ada', email: 'ada@example.com' }]
    });
    vi.mocked(removeSubscriber).mockRejectedValue(new Error('Removing the subscriber failed: Not found'));

    await expect(context.removeSubscriber('s-1')).rejects.toThrow(/Not found/);
    expect(context.subscribers.map((subscriber) => subscriber.id)).toEqual(['s-1']);
  });

  it('drops a removed subscriber', async () => {
    const context = new ProblemSetEditorWindowContext({
      ...initialValues(),
      subscribers: [{ id: 's-1', name: 'Ada', email: 'ada@example.com' }]
    });

    await context.removeSubscriber('s-1');

    expect(context.subscribers).toEqual([]);
  });
});

describe('ProblemSetEditorWindowContext collaborators', () => {
  it('inserts an added collaborator in email order', async () => {
    const context = new ProblemSetEditorWindowContext(initialValues());
    vi.mocked(addCollaborator).mockResolvedValue({ id: 't-2', name: 'Zoe', email: 'zoe@example.com' });

    await context.addCollaborator('zoe@example.com');

    expect(context.collaborators.map((collaborator) => collaborator.email)).toEqual([
      'grace@example.com',
      'zoe@example.com'
    ]);
  });

  it('surfaces the server sentence when the account is not a teacher', async () => {
    const context = new ProblemSetEditorWindowContext(initialValues());
    vi.mocked(addCollaborator).mockRejectedValue(
      new Error('Adding the collaborator failed: That account is not a teacher account.')
    );

    await expect(context.addCollaborator('student@example.com')).rejects.toThrow(/not a teacher account/);
    expect(context.collaborators.map((collaborator) => collaborator.id)).toEqual(['user-1']);
  });

  it('keeps the row when the removal is refused, and drops it when accepted', async () => {
    const context = new ProblemSetEditorWindowContext(initialValues());
    vi.mocked(removeCollaborator).mockRejectedValueOnce(new Error('Removing the collaborator failed: Not found'));

    await expect(context.removeCollaborator('user-1')).rejects.toThrow(/Not found/);
    expect(context.collaborators.map((collaborator) => collaborator.id)).toEqual(['user-1']);

    await context.removeCollaborator('user-1');
    expect(context.collaborators).toEqual([]);
  });
});
