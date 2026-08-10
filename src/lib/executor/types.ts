/**
 * @description Represents the execution output and resource metrics of a completed process.
 */
export type ProcessResult = {
  /**
   * @description The process exit code (typically `0` for success, non-zero for errors).
   * May be `undefined` if the process was terminated by a signal.
   */
  exitCode?: number;

  /**
   * @description Standard output stream buffer emitted by the process.
   */
  stdout?: Buffer;

  /**
   * @description Standard error stream buffer emitted by the process.
   */
  stderr?: Buffer;

  /**
   * @description Total CPU time consumed by the process across all cores (in milliseconds).
   */
  cpuTime?: number;

  /**
   * @description Total real-world elapsed time from process start to termination (in milliseconds).
   */
  wallTime?: number;

  /**
   * @description Peak memory consumed by the process during execution (in bytes or kilobytes).
   */
  memoryUsage?: number;
};

export type File = {
  path: string;
  content: Buffer;
};

export type ExecutionResult = {
  processOutputs: ProcessResult[];
  fileOutputs: File[];
};

export type ProcessRequest = {
  command: string;
  args: string[];
  env?: Record<string, string>;
  stdin?: Buffer;

  maxWallTime?: number;
  maxCpuTime?: number;
  maxMemory?: number;
  maxThreads?: number;
};

export type ExecutionRequest = {
  files: File[];
  processes: ProcessRequest[];
  maxDiskSpace?: number;
  maxFileCount?: number;
  exportFiles?: string[];
};
