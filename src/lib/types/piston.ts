export interface PistonExecuteRequest {
  /** Name or alias of a language listed in runtimes */
  language: string;
  /** SemVer version selector of a language listed in runtimes */
  version: string;
  /** An array of files which should be uploaded into the job context */
  files: PistonExecuteFile[];
  /** Text to pass into stdin of the program. Defaults to blank string. */
  stdin?: string;
  /** Arguments to pass to the program. Defaults to none. */
  args?: string[];
  /** Max time in ms for the run stage to finish. */
  run_timeout?: number;
  /** Max time in ms for the compile stage to finish. */
  compile_timeout?: number;
  /** Max memory for compile stage in bytes. -1 for no limit. */
  compile_memory_limit?: number;
  /** Max memory for run stage in bytes. -1 for no limit. */
  run_memory_limit?: number;
}

export interface PistonExecuteFile {
  /** Name of file to be written. If none, a random name is picked. */
  name?: string;
  /** Content of the file. */
  content: string;
  /** Encoding scheme: 'base64', 'hex', or 'utf8'. Defaults to 'utf8'. */
  encoding?: 'base64' | 'hex' | 'utf8';
}

export interface PistonExecutionResult {
  /** stdout from the process */
  stdout: string;
  /** stderr from the process */
  stderr: string;
  /** stdout and stderr combined in order of data */
  output: string;
  /** Exit code from the process, or null if signal is not null */
  code: number | null;
  /** Signal from the process, or null if code is not null */
  signal: string | null;
}

export interface PistonExecuteResponse {
  /** Name (not alias) of the runtime used */
  language: string;
  /** Version of the used runtime */
  version: string;
  /** Results from the run stage */
  run: PistonExecutionResult;
  /** Results from the compile stage (only if the runtime requires compilation) */
  compile?: PistonExecutionResult;
}
