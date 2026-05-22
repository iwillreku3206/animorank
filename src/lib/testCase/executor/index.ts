export interface CodeExecutionFile {
  name: string;
  contents: Buffer;
}

export interface CodeExecutionRequest {
  files: CodeExecutionFile[];
  compileScript: string;
  runScript: string;
  stdin?: string;
  env?: Record<string, string>;
  timeLimit?: number;
  memoryLimit?: number;
  maxThreads?: number;
  diskLimit?: number;
  maxFiles?: number;
  language?: string;
}

type CodeExecutionResponseCompileError = {
  success: false;
  reason: 'compile_error';
  error: string;
};

type CodeExecutionResponseTimeoutError = {
  success: false;
  reason: 'timeout';
};

type CodeExecutionResponseRuntimeError = {
  success: false;
  reason: 'runtime_error';
};

type CodeExecutionResponseSuccess = {
  success: true;
  exitCode: number;
  executionTime: number;
};

export type CodeExecutionResponse = (
  | CodeExecutionResponseRuntimeError
  | CodeExecutionResponseCompileError
  | CodeExecutionResponseTimeoutError
  | CodeExecutionResponseSuccess
) & {
  stdout: string;
  stderr: string;
};

export abstract class CodeExecutor {
  public abstract executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResponse>;
}
