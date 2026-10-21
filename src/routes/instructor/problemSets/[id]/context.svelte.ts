import { AutoSave, type AutoSaveState } from '$lib/utils/autosave.svelte';
import type { Tag } from '$lib/zenstack/models';
import type { CloseWindow, OpenWindow } from '$lib/window/dockviewWindowManager';
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
import type { MemberInfo } from '$lib/problemSet';

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
  collaborators: MemberInfo[];
  subscribers: MemberInfo[];
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
  /** The teachers who can edit this set; the Collaborators tab owns them. */
  public collaborators: MemberInfo[] = $state([]);
  /** The students who can practise this set; the Student Access tab owns them. */
  public subscribers: MemberInfo[] = $state([]);

  /**
   * Opens (or focuses) one of the editor's windows. This page shows its windows
   * as tabs rather than in a dockview, so the page assigns a function that
   * selects the window's tab (see `+page.svelte`); a plugin answering
   * `onProblemSetEditorLoad` uses it to bring forward the window it contributes.
   */
  public openWindow: OpenWindow = async () => {};

  /**
   * Closes one of the editor's windows. This page shows its windows as tabs,
   * so the page assigns a function that releases the window and hides its tab
   * (see `+page.svelte`); a plugin answering `onProblemSetEditorLoad` uses it
   * to close a window it contributes, and opening it again rebuilds it.
   */
  public closeWindow: CloseWindow = () => {};

  private readonly autosave: AutoSave<ProblemSetDraft>;
  private readonly _cleanup: () => void;

  constructor(initialValues: InitialValues) {
    this.problemSet = initialValues.problemSet;
    this.problems = initialValues.problems;
    this.topics = initialValues.topics;
    this.collaborators = initialValues.collaborators;
    this.subscribers = initialValues.subscribers;
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

  /**
   * Add the teacher behind an address as a collaborator. An address that is not
   * a registered teacher account rejects with the server's sentence, which the
   * tab shows beside the field.
   */
  public async addCollaborator(email: string): Promise<void> {
    const collaborator = await addCollaborator(this.problemSet.id, email);
    const others = this.collaborators.filter((existing) => existing.id !== collaborator.id);
    this.collaborators = [...others, collaborator].sort((a, b) => a.email.localeCompare(b.email));
  }

  /** Drop a collaborator; the row leaves the list only once the server agrees. */
  public async removeCollaborator(collaboratorId: string): Promise<void> {
    await removeCollaborator(this.problemSet.id, collaboratorId);
    this.collaborators = this.collaborators.filter((collaborator) => collaborator.id !== collaboratorId);
  }

  /**
   * Subscribe the student behind an address, keeping the list in order. An
   * address that is not a registered student account rejects with the server's
   * sentence, which the tab shows beside the field.
   */
  public async addSubscriber(email: string): Promise<void> {
    const subscriber = await addSubscriber(this.problemSet.id, email);
    const others = this.subscribers.filter((existing) => existing.id !== subscriber.id);
    this.subscribers = [...others, subscriber].sort((a, b) => a.email.localeCompare(b.email));
  }

  /** Unsubscribe a student; the row leaves the list only once the server agrees. */
  public async removeSubscriber(studentId: string): Promise<void> {
    await removeSubscriber(this.problemSet.id, studentId);
    this.subscribers = this.subscribers.filter((subscriber) => subscriber.id !== studentId);
  }

  public cleanup(): void {
    this._cleanup();
  }
}
