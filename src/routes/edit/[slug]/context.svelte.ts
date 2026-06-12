import { arrayToHashMap } from '$lib/utils/arrayToHashMap';
import { AutoSave, type AutoSaveState } from '$lib/utils/autosave.svelte';
import type { Problem as ProblemModel, ProblemTestCase, Tag } from '$lib/zenstack/models';
import { saveProblem, updateTestCase } from './api';

export interface InitialValues {
  problem: ProblemModel;
  testCases: ProblemTestCase[];
  tags: Tag[];
  topics: string[];
}

export class ProblemEditorWindowContext {
  public readonly tags: Tag[] = [];

  public problem: ProblemModel = $state() as unknown as ProblemModel;
  public testCases: ProblemTestCase[] = $state([]);
  public topics: string[] = $state([]);

  private problemAutosave: AutoSave<ProblemModel> = $state() as unknown as AutoSave<ProblemModel>;
  private testCaseAutosave: AutoSave<ProblemTestCase[]> = $state() as unknown as AutoSave<
    ProblemTestCase[]
  >;
  private topicsAutosave: AutoSave<string[]> = $state() as unknown as AutoSave<string[]>;

  private _cleanup: () => void;

  constructor(initialValues: InitialValues) {
    this.problem = initialValues.problem;
    this.testCases = initialValues.testCases;
    this.topics = initialValues.topics;
    this.tags = initialValues.tags;

    this.problemAutosave = new AutoSave(() => this.saveProblem(), initialValues.problem);
    this.testCaseAutosave = new AutoSave(
      (changed) => this.saveTestCases(changed),
      initialValues.testCases
    );
    this.topicsAutosave = new AutoSave(() => this.saveTopics(), initialValues.topics);

    this._cleanup = $effect.root(() => {
      $effect(() => {
        this.problemAutosave.save($state.snapshot(this.problem));
      });
      $effect(() => {
        this.testCaseAutosave.save($state.snapshot(this.testCases));
      });
      $effect(() => {
        this.topicsAutosave.save($state.snapshot(this.topics));
      });
    });
  }

  private async saveProblem() {
    const problem = $state.snapshot(this.problem);
    console.debug('Saving: ', problem);
    await saveProblem(problem.id, {
      name: problem.name,
      description: problem.description,
      visible: problem.visible,
      starter_code: problem.starter_code,
      uses_slots: problem.uses_slots,
      language: problem.language,
      difficulty_id: problem.difficulty_id,
      subject_id: problem.subject_id
    });
  }
  private async saveTestCases(changed: ProblemTestCase[]) {
    const changedMap = arrayToHashMap(changed, (tc) => tc.id);
    const testCases = $state.snapshot(this.testCases);
    const testCaseResults = await Promise.all(
      // @ts-expect-error This will have an error related to deep instantiation
      testCases
        .filter((tc) => tc.id in changedMap)
        .map((testCase) => {
          return updateTestCase(testCase);
        })
    );

    if (testCaseResults.reduce((prev, next) => prev && next, true)) {
      throw new Error('Unable to save test cases');
    }
  }
  private async saveTopics() {
    const topics = $state.snapshot(this.topics);
    console.debug('Saving: ', topics);
    await saveProblem(this.problem.id, {
      topics: topics
    });
  }

  public cleanup() {
    this._cleanup();
  }

  public get autosaveStatus(): AutoSaveState {
    const autosaves = [this.topicsAutosave, this.problemAutosave, this.testCaseAutosave];

    if (autosaves.some((a) => a.state === 'error')) return 'error';
    if (autosaves.some((a) => a.state === 'hold')) return 'hold';
    if (autosaves.some((a) => a.state === 'saving')) return 'saving';
    return 'saved';
  }
}
