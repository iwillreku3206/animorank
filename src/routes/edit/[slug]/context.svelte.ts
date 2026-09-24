import { AutoSave, type AutoSaveState } from '$lib/utils/autosave.svelte';
import type { Problem as ProblemModel, ProblemTestCase, Tag } from '$lib/zenstack/models';
import { Problem } from '$lib/problem';
import { GlobalRegistryProvider } from '$lib/registry/global';
import type { OpenWindow } from '$lib/window/dockviewWindowManager';
import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
import type { TestCase } from '$lib/testCase/testCase.svelte';
import { FunctionTestCase } from '$lib/testCase/builtin/functionTestCase/functionTestCase.svelte';
import { serializeExtensionData, type FunctionTestCaseProblemData } from '$lib/testCase/builtin/functionTestCase/types';
import { saveProblem, updateTestCase } from './api';
import { getContext, setContext, untrack } from 'svelte';
import { toJsonValue } from '$lib/types/utils';
import deepEqual from 'deep-equal';

export interface InitialValues {
  problem: ProblemModel;
  testCases: ProblemTestCase[];
  tags: Tag[];
  topics: string[];
}

export class ProblemEditorWindowContext {
  public readonly tags: Tag[] = [];

  public problem: Problem = $state() as unknown as Problem;
  public functionData: FunctionTestCaseProblemData = $state() as unknown as FunctionTestCaseProblemData;
  public testCases: TestCase[] = $state([]);
  public topics: string[] = $state([]);

  /**
   * Opens (or focuses) a window in the dockview. The editor page assigns the
   * dockview manager's own `openWindow` once the dock has attached (see
   * `ProblemEditor.svelte`), so a plugin answering `onProblemEditorLoad` can
   * open — or bring forward — a window it contributes.
   */
  public openWindow: OpenWindow = async () => {};

  // Plain fields, deliberately not `$state`: `AutoSave.state` is itself
  // reactive for the UI, and making the holder reactive would put the
  // autosave's own bookkeeping (state, timeoutId, lastSave) into the
  // dependency set of the effect that calls `save()` — whose writes would
  // then re-run that effect on every debounce, forever.
  private problemAutosave: AutoSave<ProblemModel>;
  private testCaseAutosave: AutoSave<ProblemTestCase[]>;
  private topicsAutosave: AutoSave<string[]>;

  private _cleanup: () => void;

  public static async create(initialValues: InitialValues): Promise<ProblemEditorWindowContext> {
    const problem = new Problem(initialValues.problem);
    const functionData = await problem.functionData();
    const testCases = (
      await Promise.all(
        initialValues.testCases.map(async (model) => {
          try {
            return await GlobalRegistryProvider.instance().getRegistry(TestCaseRegistry).from(model, problem);
          } catch (error) {
            console.error(`Dropping unhydratable test case ${model.id}:`, error);
            return null;
          }
        })
      )
    ).filter((tc): tc is TestCase => tc !== null);
    return new ProblemEditorWindowContext(initialValues, functionData, testCases);
  }

  private constructor(initialValues: InitialValues, functionData: FunctionTestCaseProblemData, testCases: TestCase[]) {
    this.problem = new Problem(initialValues.problem);
    this.functionData = functionData;
    // Backfill stable ids for parameters created before the id scheme so
    // syncParameters can keep values attached across removals (M8). The
    // extension_data autosave persists them.
    for (const fn of Object.values(this.functionData.functions)) {
      for (const parameter of fn.parameters) {
        parameter.id ??= crypto.randomUUID();
      }
    }
    this.testCases = testCases;
    this.topics = initialValues.topics;
    this.tags = initialValues.tags;

    this.problemAutosave = new AutoSave(() => this.saveProblem(), initialValues.problem);
    this.testCaseAutosave = new AutoSave(() => this.saveTestCases(), initialValues.testCases);
    this.topicsAutosave = new AutoSave(() => this.saveTopics(), initialValues.topics);

    this._cleanup = $effect.root(() => {
      $effect(() => {
        const snapshot = $state.snapshot(this.problem.model) as unknown as ProblemModel;
        this.problemAutosave.save(snapshot);
      });
      $effect(() => {
        this.testCaseAutosave.save(this.testCases.map((tc) => this.serializeTestCase(tc)));
      });
      $effect(() => {
        this.topicsAutosave.save($state.snapshot(this.topics));
      });
      // Keep the serialized extension_data in sync with the function data state.
      $effect(() => {
        const serialized = serializeExtensionData(this.functionData);
        const prev = untrack(() => this.problem.extension_data as Record<string, unknown>);
        // Only write when the value actually changes. Writing an unchanged
        // `extension_data` re-invalidates this effect (it reads the field), and
        // because the sibling effects share this root, that re-runs all of them.
        if (!deepEqual(prev['builtin_testCase_function'], serialized, { strict: true })) {
          this.problem.extension_data = { ...prev, builtin_testCase_function: serialized };
        }
      });
      // Fill in default values for parameters added to function definitions.
      $effect(() => {
        for (const testCase of this.testCases) {
          if (testCase instanceof FunctionTestCase) {
            void testCase.syncParameters(this.functionData);
          }
        }
      });
    });
  }

  /**
   * Dev-only: report what changed between successive problem snapshots, so the
   * write that keeps re-running the autosave effect is named rather than guessed.
   */
  /**
   * Add an empty function definition keyed by uuid. The details (name,
   * symbol, parameters, return types) are filled in through the editor binds.
   */
  public addFunction(): void {
    const key = crypto.randomUUID();
    this.functionData.functions[key] = { name: '', symbol: '', parameters: [], returnType: [] };
  }

  /**
   * Remove a function definition. Refuses (returns false) when a test case
   * still references it: the autosave would persist the dangling reference
   * and the next edit-page load would fail validation for every collaborator,
   * with no way to repair through the UI. Delete the referencing test cases
   * first.
   */
  public removeFunction(id: string): boolean {
    const referenced = this.testCases.some(
      (testCase) => testCase instanceof FunctionTestCase && testCase.data.function === id
    );
    if (referenced) return false;
    delete this.functionData.functions[id];
    return true;
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

  /**
   * Serialize a test case for persistence: the model with `data` converted
   * from the hydrated form (class instances) to the stored JSON shape.
   */
  private serializeTestCase(testCase: TestCase): ProblemTestCase {
    return {
      ...(testCase.model as ProblemTestCase),
      data: toJsonValue(testCase.data)
    };
  }

  private async saveTestCases() {
    const testCaseResults = await Promise.all(
      this.testCases.map((testCase) => updateTestCase(this.serializeTestCase(testCase)))
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
