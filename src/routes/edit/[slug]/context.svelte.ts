import { AutoSave, type AutoSaveState } from '$lib/utils/autosave.svelte';
import type { Problem as ProblemModel, ProblemTestCase, Tag } from '$lib/zenstack/models';
import { Problem } from '$lib/problem';
import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
import type { TestCase } from '$lib/testCase/testCase.svelte';
import { saveProblem, updateTestCase } from './api';
import { getContext, setContext } from 'svelte';

export interface InitialValues {
  problem: ProblemModel;
  testCases: ProblemTestCase[];
  tags: Tag[];
  topics: string[];
}

export class ProblemEditorWindowContext {
  public readonly tags: Tag[] = [];

  public problem: Problem = $state() as unknown as Problem;
  public testCases: TestCase[] = $state([]);
  public topics: string[] = $state([]);

  private problemAutosave: AutoSave<ProblemModel> = $state() as unknown as AutoSave<ProblemModel>;
  private testCaseAutosave: AutoSave<ProblemTestCase[]> = $state() as unknown as AutoSave<ProblemTestCase[]>;
  private topicsAutosave: AutoSave<string[]> = $state() as unknown as AutoSave<string[]>;

  private _cleanup: () => void;

  constructor(initialValues: InitialValues) {
    this.problem = new Problem(initialValues.problem);
    this.testCases = initialValues.testCases
      .map((model) => {
        try {
          return TestCaseRegistry.instance().from(model, this.problem);
        } catch {
          return null;
        }
      })
      .filter((tc): tc is TestCase => tc !== null);
    this.topics = initialValues.topics;
    this.tags = initialValues.tags;

    this.problemAutosave = new AutoSave(() => this.saveProblem(), initialValues.problem);
    this.testCaseAutosave = new AutoSave(() => this.saveTestCases(), initialValues.testCases);
    this.topicsAutosave = new AutoSave(() => this.saveTopics(), initialValues.topics);

    this._cleanup = $effect.root(() => {
      $effect(() => {
        this.problemAutosave.save($state.snapshot(this.problem.model));
      });
      $effect(() => {
        this.testCaseAutosave.save($state.snapshot(this.testCases.map((tc) => tc.model)));
      });
      $effect(() => {
        this.topicsAutosave.save($state.snapshot(this.topics));
      });
    });
  }

  private async saveProblem() {
    const problem = $state.snapshot(this.problem.model);
    console.debug('Saving: ', problem);
    await saveProblem(problem.id, {
      name: problem.name,
      description: problem.description,
      visible: problem.visible,
      starter_code: problem.starter_code,
      uses_slots: problem.uses_slots,
      language: problem.language,
      difficulty_id: problem.difficulty_id,
      subject_id: problem.subject_id,
      extension_data: this.problem.extension_data
    });
  }

  private async saveTestCases() {
    const testCases = $state.snapshot(this.testCases.map((tc) => tc.model));
    const testCaseResults = await Promise.all(
      testCases.map((testCase: ProblemTestCase) => {
        return updateTestCase(testCase);
      })
    );

    if (!testCaseResults.every((save) => save)) {
      throw new Error('Unable to save test cases');
    }
  }

  private async saveTopics() {
    const topics = $state.snapshot(this.topics);
    await saveProblem(this.problem.model.id, {
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

const problemEditorContextKey = Symbol('problem-editor-context');

export function setProblemEditorContext(context: ProblemEditorWindowContext): void {
  setContext(problemEditorContextKey, context);
}

export function getProblemEditorContext(): ProblemEditorWindowContext {
  return getContext<ProblemEditorWindowContext>(problemEditorContextKey);
}
