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

    this.autosave = new AutoSave(() => this.persist(), this.draft());

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

  private async persist(): Promise<void> {
    await saveProblemSet(this.problemSet.id, this.draft());
  }

  /** The autosave state, for the editor status indicator. */
  public get autosaveStatus(): AutoSaveState {
    return this.autosave.state;
  }

  /** Persist immediately, bypassing the debounce. */
  public forceSave(): Promise<void> {
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
