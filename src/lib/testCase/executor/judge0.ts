import AdmZip from 'adm-zip';
import { CodeExecutor, type CodeExecutionRequest, type CodeExecutionResponse } from '.';
import type { Judge0SubmissionRequest, Judge0SubmissionResponse } from '$lib/types/judge0';
import { JUDGE0_BASE_URL } from '$env/static/private';

export class Judge0Executor extends CodeExecutor {
  public async executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResponse> {
    const zip = new AdmZip();
    for (const file of request.files) {
      zip.addFile(file.name, file.contents);
    }

    zip.addFile('compile', Buffer.from(request.compileScript, 'utf8'));
    zip.addFile('run', Buffer.from(request.runScript, 'utf8'));

    const submissionParams: Judge0SubmissionRequest = {
      language_id: 89,
      additional_files: zip.toBuffer().toString('base64')
    };

    const req = await fetch(`${JUDGE0_BASE_URL}/submissions?wait=true&base64_encoded=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionParams)
    });
    const res = (await req.json()) as Judge0SubmissionResponse;

    let { stdout, stderr } = res;

    stdout = Buffer.from(res.stdout || '', 'base64').toString('utf8');
    stderr = Buffer.from(res.stderr || '', 'base64').toString('utf8');

    if (res.status.id === 6) {
      // Compile error
      return {
        success: false,
        reason: 'compile_error',
        error: Buffer.from(res.compile_output || '', 'base64').toString('utf8'),
        stdout,
        stderr
      };
    }

    if (res.status.id === 5) {
      // Timeout error
      return {
        success: false,
        reason: 'timeout',
        stdout,
        stderr
      };
    }

    if (res.status.id !== 3) {
      // 3 is success, so anything else is a runtime error
      return {
        success: false,
        reason: 'runtime_error',
        stdout,
        stderr
      };
    }

    return {
      success: true,
      stdout,
      stderr,
      executionTime: parseFloat(res.time || ''),
      exitCode: res.exit_code || -99
    };
  }
}
