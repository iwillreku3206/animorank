import { arrayToHashMap } from '$lib/utils/arrayToHashMap';
import { AutoSave, type AutoSaveState } from '$lib/utils/autosave.svelte';
import type { Problem, ProblemSet, Tag } from '$lib/zenstack/models';
import { addProblem, saveProblem, saveProblemSet } from './api';

export interface InitialValues {
  problemSet: ProblemSet;
  problems: Problem[];
  topics: string[];
  collaborators: string[];
  students: string[];

  tags: Tag[];
}

export class ProblemSetEditorWindowContext {
  public readonly tags: Tag[] = [];

  public problemSet: ProblemSet = $state() as unknown as ProblemSet;
  public problems: Problem[] = $state() as unknown as Problem[];
  public topics: string[] = $state() as unknown as string[];
  public collaborators: string[] = $state() as unknown as string[];
  public students: string[] = $state() as unknown as string[];

  public problemSetAutosave: AutoSave<ProblemSet> = $state() as unknown as AutoSave<ProblemSet>;
  public problemsAutosave: AutoSave<Problem[]> = $state() as unknown as AutoSave<Problem[]>;
  public topicsAutosave: AutoSave<string[]> = $state() as unknown as AutoSave<string[]>;
  public collaboratorsAutosave: AutoSave<string[]> = $state() as unknown as AutoSave<string[]>;
  public studentsAutosave: AutoSave<string[]> = $state() as unknown as AutoSave<string[]>;

  private _cleanup: () => void;

  constructor(initialValues: InitialValues) {
    this.problemSet = initialValues.problemSet;
    this.problems = initialValues.problems;
    this.topics = initialValues.topics;
    this.collaborators = initialValues.collaborators;
    this.students = initialValues.students;

    this.problemSetAutosave = new AutoSave<ProblemSet>(
      () => this.saveProblemSet(),
      initialValues.problemSet
    );
    this.problemsAutosave = new AutoSave<Problem[]>(
      () => this.saveProblems(),
      initialValues.problems
    );
    this.topicsAutosave = new AutoSave<string[]>(() => this.saveTopics(), initialValues.topics);
    this.collaboratorsAutosave = new AutoSave<string[]>(
      () => this.saveCollaborators(),
      initialValues.collaborators
    );
    this.studentsAutosave = new AutoSave<string[]>(
      () => this.saveStudents(),
      initialValues.students
    );

    this._cleanup = $effect.root(() => {
      $effect(() => {
        this.problemSetAutosave.save($state.snapshot(this.problemSet));
      });
      $effect(() => {
        this.problemsAutosave.save($state.snapshot(this.problems));
      });
      $effect(() => {
        this.topicsAutosave.save($state.snapshot(this.topics));
      });
      $effect(() => {
        this.collaboratorsAutosave.save($state.snapshot(this.collaborators));
      });
      $effect(() => {
        this.studentsAutosave.save($state.snapshot(this.students));
      });
    });
  }

  private async saveProblemSet() {
    await saveProblemSet({
      id: this.problemSet.id,
      title: this.problemSet.title,
      description: this.problemSet.description,
      auto_accept: this.problemSet.auto_accept,
      is_global: this.problemSet.is_global,
      subject_id: this.problemSet.subject_id,
      difficulty_id: this.problemSet.difficulty_id,
      topic_ids: this.topics
    });
  }
  public async addProblem() {
    this.problems.push(await addProblem(this.problemSet.id));
  }
  private async saveProblems(changed: Problem[]) {
    const changedMap = arrayToHashMap(changed, (p) => p.id);
    const problems = $state.snapshot(this.problems);
    const problemResults = await Promise.all(
      problems
        .filter((problem) => problem.id in changedMap)
        .map((problem) => {
          return saveProblem(problem);
        })
    );
  }
  private async saveTopics() {
    const topic_ids = $state.snapshot(this.topics);
    await saveProblem({
      id: this.problemSet.id,
      topics: topic_ids
    });
  }
  private async saveCollaborators() {}
  private async saveStudents() {}

  public cleanup() {
    this._cleanup();
  }

  public get autosaveStatus(): AutoSaveState {
    const autosaves = [
      this.problemSetAutosave,
      this.problemsAutosave,
      this.topicsAutosave,
      this.collaboratorsAutosave,
      this.studentsAutosave
    ];

    if (autosaves.some((a) => a.state === 'error')) return 'error';
    if (autosaves.some((a) => a.state === 'hold')) return 'hold';
    if (autosaves.some((a) => a.state === 'saving')) return 'saving';
    return 'saved';
  }
}
