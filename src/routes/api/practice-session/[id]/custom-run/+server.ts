import z from 'zod';
import type { RequestHandler } from './$types';
import { error, successObject } from '$lib/response';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { CodeExecutor, type CodeExecutionRequest } from '$lib/testCase/executor';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';

import compile from '$lib/testCase/testCase/programIOTestCase/compile.sh?raw';
import run from '$lib/testCase/testCase/programIOTestCase/run.sh?raw';

const customRunValidator = z.object({
  stdin: z.string().default('')
});

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const session = await locals.auth();
  if (!session) return error(403, 'Unauthorized');

  const {
    success: parseSuccess,
    data: parsedData,
    error: parseError
  } = await customRunValidator.safeParseAsync(await request.json());
  if (!parseSuccess) return error(400, parseError);

  const serviceProvider = ServerServiceProvider.instance();
  const practiceSessionService = serviceProvider.getService(PracticeSessionService);
  const codeExecutor = serviceProvider.getService(CodeExecutor);

  const practiceSession = await practiceSessionService.findById({
    id: params.id,
    user: session.user
  });
  if (!practiceSession) return error(404, 'Practice session not found');

  const codeExecutionRequest: CodeExecutionRequest = {
    compileScript: compile,
    runScript: run,
    stdin: parsedData.stdin,
    files: [
      {
        name: 'main.c',
        contents: Buffer.from(practiceSession.previousCode.fullCode, 'utf8')
      }
    ],
    timeLimit: 30
  };

  const result = await codeExecutor.executeCode(codeExecutionRequest);

  return successObject({
    success: result.success,
    stdout: result.stdout,
    stderr: result.stderr,
    error: !result.success && result.reason === 'compile_error' ? result.error : undefined
  });
};
