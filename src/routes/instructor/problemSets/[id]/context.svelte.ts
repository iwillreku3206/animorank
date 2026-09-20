import { AutoSave, type AutoSaveState } from '$lib/utils/autosave.svelte';
import type { Tag } from '$lib/zenstack/models';
import { addProblem, deleteProblem, saveProblem, saveProblemSet } from './api';

/**
 * A problem as the editor needs it. Deliberately its own shape rather than the
 * zenstack model: the server load augments each problem with its topic ids, and
 * intersecting that onto `FlatModelResult` is what made the original port fail
 * to typecheck.
 */
export interface EditorProblem {
  id: string;
  name: string;
  visible: boolean;
  difficulty_id: string | null;
  topics: string[];
}

/** The problem set fields this editor owns. */
export interface EditorProblemSet {
  id: string;
  title: string;
  description: string;
  auto_accept: boolean;
  is_global: boolean;
  subject_id: string | null;
  difficulty_id: string | null;
}

export interface InitialValues {
  problemSet: EditorProblemSet;
  problems: EditorProblem[];
  topics: string[];
  collaborators: string[];
  tags: Tag[];
}

/**
 * The payload compared between autosaves. Topics live on the problem set's PUT
 * alongside the scalar fields, so they share one autosave rather than the
 * separate (and misrouted) topic save the first draft had.
 */
interface ProblemSetDraft {
  title: string;
  description: string;
  auto_accept: boolean;
  is_global: boolean;
  subject_id: string | null;
  difficulty_id: string | null;
  topic_ids: string[];
}

export class ProblemSetEditorWindowContext {
  public readonly tags: Tag[];

  public problemSet: EditorProblemSet = $state() as unknown as EditorProblemSet;
  public problems: EditorProblem[] = $state([]);
  public topics: string[] = $state([]);
  public collaborators: string[] = $state([]);

  private readonly autosave: AutoSave<ProblemSetDraft>;
  private readonly _cleanup: () => void;

  constructor(initialValues: InitialValues) {
    this.problemSet = initialValues.problemSet;
    this.problems = initialValues.problems;
    this.topics = initialValues.topics;
    this.collaborators = initialValues.collaborators;
    this.tags = initialValues.tags;

    this.autosave = new AutoSave((draft) => this.persist(draft), this.draft());

    this._cleanup = $effect.root(() => {
      $effect(() => {
        this.autosave.save(this.draft());
      });
    });
  }

  /** The current problem set state, snapshotted for comparison and sending. */
  private draft(): ProblemSetDraft {
    return {
      title: this.problemSet.title,
      description: this.problemSet.description,
      auto_accept: this.problemSet.auto_accept,
      is_global: this.problemSet.is_global,
      subject_id: this.problemSet.subject_id,
      difficulty_id: this.problemSet.difficulty_id,
      topic_ids: $state.snapshot(this.topics)
    };
  }

  /**
   * Writes one revision of the draft. `draft` is the snapshot the autosave
   * queued, not a fresh read of the editor -- writes are serialised, so a
   * re-read here would send whatever the instructor had typed by the time this
   * write reached the front of the queue while the autosave recorded the older
   * queued snapshot as its baseline. Reverting to that snapshot would then
   * dedup against a value the server never received, leaving the editor
   * reading 'saved' over text the instructor had already undone.
   */
  private async persist(draft: ProblemSetDraft): Promise<void> {
    await saveProblemSet(this.problemSet.id, draft);
  }

  /** The autosave state, for the editor status indicator. */
  public get autosaveStatus(): AutoSaveState {
    return this.autosave.state;
  }

  /**
   * Persist immediately, bypassing the debounce, resolving to whether the
   * server holds the draft. Nothing here acts on the answer yet -- unlike the
   * solve view, no action downstream reads the server's copy back.
   */
  public forceSave(): Promise<boolean> {
    return this.autosave.forceSave(this.draft());
  }

  public async addProblem(): Promise<void> {
    const problem = await addProblem(this.problemSet.id);
    this.problems.push({
      id: problem.id,
      name: problem.name,
      visible: problem.visible,
      difficulty_id: problem.difficulty_id ?? null,
      topics: []
    });
  }

  public async deleteProblem(problemId: string): Promise<void> {
    await deleteProblem(problemId);
    this.problems = this.problems.filter((p) => p.id !== problemId);
  }

  /**
   * Visibility is written straight through rather than autosaved: it is a
   * single deliberate toggle, and the problem list holds no other editable
   * problem fields.
   */
  public async setProblemVisible(problemId: string, visible: boolean): Promise<void> {
    const problem = this.problems.find((p) => p.id === problemId);
    if (!problem) return;
    const previous = problem.visible;
    problem.visible = visible;
    try {
      await saveProblem(problemId, { visible });
    } catch (error) {
      problem.visible = previous;
      throw error;
    }
  }

  public cleanup(): void {
    this._cleanup();
  }
}
