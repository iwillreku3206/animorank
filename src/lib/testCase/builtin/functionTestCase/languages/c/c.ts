import { CodeEditorState } from '$lib/editor/code';
import { type ProblemTestCase as TestCaseModel } from '$lib/zenstack/models';
import { CodeExecutor } from '$lib/executor';
import type { File } from '$lib/executor/types';
import { TestCaseLanguage } from '$lib/testCase/testCaseLanguage.server';
import type { TestCaseResult } from '$lib/testCase/types';
import { type IntoJsonValue } from '$lib/types/utils';
import { arrayToHashMap } from '$lib/utils/arrayToHashMap';
import { parseSlots } from '$lib/utils/parseSlots';
import type { ServerFunctionTestCase } from '../../functionTestCase.server';
import type { FunctionTestCaseRunInfo } from '../../functionTestCase.svelte';
import { loadExtensionData } from '../../types.server';
import { CExecutionContext } from './executionContext';
import { CTypeRegistry } from './typeRegistry';

export class CFunctionTestCase extends TestCaseLanguage<ServerFunctionTestCase> {
  private readonly typeRegistry = new CTypeRegistry();

  private generateCode(): [string, string[]] {
    const { function: functionName, parameters } = this.testCase.testCase.data;
    const { problem } = this.testCase.testCase;

    const { functions } = loadExtensionData(problem);

    if (!(functionName in functions)) {
      throw new Error('Missing function definition for function:' + functionName);
    }

    const fn = functions[functionName];

    // TODO: if return type is null, set return type to VOID
    const rawReturnType = fn.returnType[0];
    if (!rawReturnType) {
      throw new Error('Cannot generate code: function has no return type');
    }
    const returnType = this.typeRegistry.getInstance(rawReturnType.id, this, rawReturnType);

    const fnParameters = fn.parameters.map((parameter) => {
      const { type } = parameter;
      return this.typeRegistry.getInstance(type!.id, this, type!);
    });

    const context = new CExecutionContext();

    context.pushHeader('stdio.h', true);
    context.pushHeader('stdlib.h', true);
    context.pushHeader('string.h', true);
    context.pushHeader('submission.c');

    // get definitions
    fn.returnType.forEach((type) => {
      const languageType = this.typeRegistry.getInstance(type!.id, this, type!);
      languageType.pushPreDefinitions(context);
    });

    fnParameters.forEach((parameter) => {
      parameter.pushPreDefinitions(context);
    });

    // declare function
    context.declareFunction(
      fn.symbol || fn.name,

      returnType.generateReturnType(),
      fnParameters.map((p) => p.generateReturnType()).join(', ')
    );

    // start building main
    context.beginFunction('main', 'int', '');

    // prepare parameters
    const parameterSymbols = [];

    if (fn.parameters.length !== parameters.length) {
      throw new Error(
        `Parameter count mismatch: function expects ${fn.parameters.length}, but ${parameters.length} were supplied`
      );
    }

    for (const i in parameters) {
      const parameter = parameters[i];
      const symbol = context.getNewSymbol();
      parameterSymbols.push(symbol);
      const languageType = this.typeRegistry.getInstance(parameter.value.type.id, this, parameter.value.type);
      languageType.pushDeclaration(context, symbol, parameter.value);
    }

    // prepare return value
    let returnTypeSymbol: string | undefined;
    if (fn.returnType.length !== 0) {
      returnTypeSymbol = context.getNewSymbol();
      returnType.pushDeclaration(context, returnTypeSymbol);
    }

    // execute the function
    if (returnTypeSymbol) {
      context.pushCodeRaw(`${returnTypeSymbol} = `);
    }

    context.pushCode(`${fn.symbol || fn.name}(${parameterSymbols.join(', ')});`);

    const fileHandleSymbols = [];
    const fileNames = [];

    // print out all values
    for (const i in parameters) {
      const parameter = parameters[i];
      const languageType = this.typeRegistry.getInstance(parameter.value.type.id, this, parameter.value.type);
      const fileHandle = context.getNewSymbol();
      fileHandleSymbols.push(fileHandle);
      const fileName = `__ar_test_param${i}`;
      fileNames.push(fileName);
      context.pushCode(`FILE* ${fileHandle} = fopen("${fileName}", "w");`);
      languageType.pushPrint(context, parameterSymbols[i], fileHandle);
    }

    if (returnTypeSymbol) {
      const type = fn.returnType[0]!;
      const languageType = this.typeRegistry.getInstance(type.id, this, type);
      const fileHandle = context.getNewSymbol();
      fileHandleSymbols.push(fileHandle);
      fileNames.push('__ar_test_return');
      context.pushCode(`FILE* ${fileHandle} = fopen("__ar_test_return", "w");`);
      languageType.pushPrint(context, returnTypeSymbol, fileHandle);
    }

    // close all files
    for (const i of fileHandleSymbols) {
      context.pushCode(`fclose(${i});`);
    }

    // exit program
    context.pushCode('return 0;');
    context.endFunction();

    return [context.currentCode, fileNames];
  }

  public async execute(executor: CodeExecutor, state: IntoJsonValue): Promise<TestCaseResult<FunctionTestCaseRunInfo>> {
    const codeState = new CodeEditorState(state);
    const { problem, data } = this.testCase.testCase;
    const { comparisons } = data;
    const previousCode = problem.uses_slots
      ? codeState.sections['code']
      : parseSlots(problem.starter_code, codeState.sections).fullCode;

    const [generatedCode, fileNames] = this.generateCode();

    const files: File[] = [
      {
        path: 'submission.c',
        content: Buffer.from(previousCode, 'utf8')
      },
      {
        path: 'main.c',
        content: Buffer.from(generatedCode, 'utf8')
      }
    ];
    const result = await executor.execute({
      files,
      processes: [
        {
          command: 'gcc',
          args: ['-Wall', '-Werror', '-o', '__ar_test_main', 'submission.c', 'main.c', '-lm']
        }
      ],
      exportFiles: fileNames
    });

    const resultFiles = arrayToHashMap(result.fileOutputs, (f) => f.path);

    const results = [];
    for (const comparison of comparisons) {
      const symbol = comparison.symbol;
      const file = resultFiles[`__ar_test_${symbol}`];
      const fileContent = file.content.toString('utf8');
      const actual = this.typeRegistry
        .getInstance(comparison.value.type.id, this, comparison.value.type)
        .readFromPrint(fileContent);
      const result = comparison.operator.compare(comparison.value, actual);

      results.push({ result, symbol, actual: actual, expected: comparison.value });
    }

    const success = results.every((r) => r.result === true);

    if (this.testCase.testCase.model.public === true) {
      return {
        success,
        runInfo: { comparisons: results },
        testCaseInfo: this.testCase.testCase.model as TestCaseModel & { public: true },
        compilerOutput: result.processOutputs[0]?.stderr?.toString('utf8')
      };
    } else {
      return {
        success,
        testCaseInfo: this.testCase.testCase.model as TestCaseModel & { public: false }
      };
    }
  }
}
