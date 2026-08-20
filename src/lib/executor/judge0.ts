import AdmZip from 'adm-zip';
import { CLanguage } from '$lib/language/c';
import type { Language } from '$lib/language';
import { CodeExecutor } from '.';
import type { ExecutionRequest, ExecutionResult, File, ProcessRequest, ProcessResult } from './types';
import type { Judge0SubmissionRequest, Judge0SubmissionResponse } from '$lib/types/judge0';
import { env } from '$env/dynamic/private';

/**
 * Build the compile script: one command line per process, EXCEPT the last
 * process (which is the run process). Judge0's multi-file language runs the
 * `compile` file for compilation and `run` for execution, both via bash.
 */
export function buildCompileScript(processes: ProcessRequest[]): string {
  if (processes.length < 2) return '';
  return processes
    .slice(0, -1)
    .map((process) => [process.command, ...process.args].join(' '))
    .join('\n');
}

/**
 * Build the run script: the last process's command line, followed by a
 * begin/cat/end marker triple per exported file so results can be extracted
 * from stdout.
 */
export function buildRunScript(processes: ProcessRequest[], exportFiles: string[]): string {
  const last = processes.at(-1);
  if (!last) return '';
  const lines = [[last.command, ...last.args].join(' ')];
  for (const path of exportFiles) {
    // TODO: escape paths
    lines.push(
      `printf '<<<__AR_FILE_BEGIN:%s>>>\\n' "${path}"`,
      `cat "${path}"`,
      `printf '<<<__AR_FILE_END:%s>>>\\n' "${path}"`
    );
  }
  return lines.join('\n');
}

/**
 * Extract files exported via the begin/cat/end marker convention from stdout.
 * `cat` emits the file content verbatim (no added newline), so the end marker
 * directly follows the content. Paths without a matching begin/end pair yield
 * no entry.
 */
export function parseFileOutputs(stdout: Buffer): File[] {
  const text = stdout.toString('utf8');
  const files: File[] = [];
  const regex = /<<<__AR_FILE_BEGIN:(.*?)>>>\n([\s\S]*?)<<<__AR_FILE_END:\1>>>\n/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    files.push({ path: match[1], content: Buffer.from(match[2], 'utf8') });
  }
  return files;
}

export class Judge0Executor extends CodeExecutor {
  static id = 'default'; // CodeExecutorRegistry.registerCodeExecutor keys by this; ServiceProvider.getService(CodeExecutor) → getDefault() → 'default'
  static languages(): Language[] {
    return [new CLanguage()];
  }

  public async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    if (!env.JUDGE0_BASE_URL) throw new Error('Judge0 is not configured (JUDGE0_BASE_URL is empty)');

    const zip = new AdmZip();
    for (const file of request.files) {
      zip.addFile(file.path, file.content);
    }
    zip.addFile('compile', Buffer.from(buildCompileScript(request.processes), 'utf8'));
    zip.addFile('run', Buffer.from(buildRunScript(request.processes, request.exportFiles ?? []), 'utf8'));

    // The maximum wall-time requested by any process, in seconds. Omitted when
    // unset so Judge0 applies its server-configured default (the old executor
    // sent no limit either; this deployment rejects values above 20s).
    const wallTimeLimit = Math.max(...request.processes.map((p) => p.maxWallTime ?? 0));
    const submissionParams: Judge0SubmissionRequest = {
      language_id: 89,
      additional_files: zip.toBuffer().toString('base64'),
      stdin: request.processes.at(-1)?.stdin?.toString('base64'),
      wall_time_limit: wallTimeLimit > 0 ? wallTimeLimit : undefined
    };

    const req = await fetch(`${env.JUDGE0_BASE_URL}/submissions?wait=true&base64_encoded=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionParams)
    });
    const res = (await req.json()) as Judge0SubmissionResponse;

    const stdout = Buffer.from(res.stdout ?? '', 'base64');
    const stderr = Buffer.from(res.stderr ?? '', 'base64');

    if (res.status.id === 6) {
      // Compile error
      return {
        processOutputs: [{ exitCode: 1, stderr: Buffer.from(res.compile_output ?? '', 'base64') }],
        fileOutputs: []
      };
    }

    if (res.status.id === 5) {
      // Timeout error
      return {
        processOutputs: [{ exitCode: undefined }],
        fileOutputs: []
      };
    }

    // 3 is accepted; any other status is a runtime error
    const runProcess: ProcessResult = {
      exitCode: res.exit_code ?? (res.status.id === 3 ? 0 : 1),
      stdout,
      stderr,
      cpuTime: Math.round(parseFloat(res.time ?? '0') * 1000),
      wallTime: Math.round(parseFloat(res.time ?? '0') * 1000),
      memoryUsage: res.memory ?? undefined
    };
    return {
      processOutputs: [{ exitCode: 0 }, runProcess],
      fileOutputs: parseFileOutputs(stdout)
    };
  }
}
