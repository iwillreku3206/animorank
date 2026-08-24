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

// Remove student-defined `main` declarations before the submission is
// included into the generated harness: the harness provides the entry point,
// so a student `main` would otherwise fail to link. The declaration pattern
// follows the legacy customTestCase implementation, with the parameter list
// broadened to any non-parenthesis characters (covers `char *argv[]`, `const`,
// underscores, …).
const mainRegex = /(int|void) main\s*\([^()]*\)\s*\{/g;

/**
 * Strip any `main` function declaration from a C submission. Line endings are
 * normalized to `\n` first so the regex matches Windows-style sources too.
 *
 * The body is consumed with balanced braces (the legacy regex's greedy
 * `(.|\s)*` tail would delete everything after a leading `main`, e.g. a
 * slots template whose `main` wraps the student code).
 */
export function stripMain(code: string): string {
  const normalized = code.replaceAll('\r\n', '\n');
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = mainRegex.exec(normalized)) !== null) {
    // The header match ends at the opening brace; scan for its matching close.
    let depth = 0;
    let i = match.index + match[0].length - 1;
    for (; i < normalized.length; i++) {
      const ch = normalized[i];
      if (ch === '{') {
        depth++;
      } else if (ch === '}' && --depth === 0) {
        break;
      }
    }

    if (depth !== 0) {
      // Unbalanced braces: keep the match and continue scanning past it.
      mainRegex.lastIndex = match.index + match[0].length;
      continue;
    }

    result += normalized.slice(lastIndex, match.index);
    lastIndex = i + 1;
    mainRegex.lastIndex = i + 1;
  }
  result += normalized.slice(lastIndex);
  return result;
}

export class CFunctionTestCase extends TestCaseLanguage<ServerFunctionTestCase> {
  static typeRegistry = new CTypeRegistry();

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
    const returnType = CFunctionTestCase.typeRegistry.getInstance(rawReturnType.id, this, rawReturnType);

    const fnParameters = fn.parameters.map((parameter) => {
      const { type } = parameter;
      return CFunctionTestCase.typeRegistry.getInstance(type!.id, this, type!);
    });

    const context = new CExecutionContext();

    context.pushHeader('stdio.h', true);
    context.pushHeader('stdlib.h', true);
    context.pushHeader('string.h', true);
    context.pushHeader('submission.c');

    // get definitions
    fn.returnType.forEach((type) => {
      const languageType = CFunctionTestCase.typeRegistry.getInstance(type!.id, this, type!);
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
      const languageType = CFunctionTestCase.typeRegistry.getInstance(
        parameter.value.type.id,
        this,
        parameter.value.type
      );
      languageType.pushDeclaration(context, symbol, parameter.value);
    }

    // prepare return value
    let returnTypeSymbol: string | undefined;
    if (fn.returnType.length !== 0 && rawReturnType.id !== 'void') {
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
      const languageType = CFunctionTestCase.typeRegistry.getInstance(
        parameter.value.type.id,
        this,
        parameter.value.type
      );
      const fileHandle = context.getNewSymbol();
      fileHandleSymbols.push(fileHandle);
      const fileName = `__ar_test_param${i}`;
      fileNames.push(fileName);
      context.pushCode(`FILE* ${fileHandle} = fopen("${fileName}", "w");`);
      languageType.pushPrint(context, parameterSymbols[i], fileHandle);
    }

    if (returnTypeSymbol) {
      const type = fn.returnType[0]!;
      const languageType = CFunctionTestCase.typeRegistry.getInstance(type.id, this, type);
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
      ? parseSlots(problem.starter_code, codeState.sections).fullCode
      : (codeState.sections['body'] ?? '');

    const [generatedCode, fileNames] = this.generateCode();

    const files: File[] = [
      {
        path: 'submission.c',
        content: Buffer.from(stripMain(previousCode), 'utf8')
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
          // main.c includes submission.c (see generateCode), so compiling both
          // files would define every function twice and fail to link.
          command: 'gcc',
          args: ['-Wall', '-Werror', '-o', '__ar_test_main', 'main.c', '-lm']
        },
        { command: './__ar_test_main', args: [] }
      ],
      exportFiles: fileNames
    });

    const resultFiles = arrayToHashMap(result.fileOutputs, (f) => f.path);

    // A compile or runtime failure means the export files never appeared, so
    // the comparison values cannot be reconstructed. Report the failure with
    // the compiler/run diagnostics instead of a fabricated comparison.
    const missingFile = fileNames.find((name) => !(name in resultFiles));
    if (missingFile) {
      const compileExitCode = result.processOutputs[0]?.exitCode;
      const failure =
        compileExitCode === undefined ? 'timeout' : compileExitCode === 0 ? 'output_not_generated' : 'compile_error';
      if (this.testCase.testCase.model.public === true) {
        return {
          success: false,
          runInfo: { failure },
          testCaseInfo: this.testCase.testCase.model as TestCaseModel & { public: true },
          compilerOutput: failure === 'compile_error' ? result.processOutputs[0]?.stderr?.toString('utf8') : undefined
        };
      } else {
        return { success: false, testCaseInfo: { public: false } };
      }
    }

    // The run process exited abnormally (crash, signal, non-zero exit) after
    // the harness started writing export files. The run script prints a
    // begin/cat/end marker triple unconditionally, so the files are present
    // but empty even when the program segfaulted before fopen; comparing
    // those empty values would throw (BigInt('')) or fail misleadingly, and
    // the real crash stderr would be dropped. Report a distinct failure.
    const runProcess = result.processOutputs[1];
    if (runProcess && runProcess.exitCode !== 0) {
      if (this.testCase.testCase.model.public === true) {
        return {
          success: false,
          runInfo: {
            failure: 'run_error',
            exitCode: runProcess.exitCode,
            stderr: runProcess.stderr?.toString('utf8')
          },
          testCaseInfo: this.testCase.testCase.model as TestCaseModel & { public: true }
        };
      } else {
        return { success: false, testCaseInfo: { public: false } };
      }
    }

    const results = [];
    for (const comparison of comparisons) {
      const symbol = comparison.symbol;
      const file = resultFiles[`__ar_test_${symbol}`];
      const fileContent = file.content.toString('utf8');
      const actual = CFunctionTestCase.typeRegistry
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
