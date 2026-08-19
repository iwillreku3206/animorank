import z from 'zod';
import type { RequestHandler } from './$types';
import { error, successObject } from '$lib/response';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { CodeExecutor } from '$lib/executor';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';

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

  const result = await codeExecutor.execute({
    files: [{ path: 'main.c', content: Buffer.from(practiceSession.previousCode.fullCode, 'utf8') }],
    processes: [
      { command: 'gcc', args: ['-Werror', '-Wall', '-o', 'program', 'main.c', '-lm'] },
      { command: './program', args: [], stdin: Buffer.from(parsedData.stdin, 'utf8') }
    ]
  });

  const compile = result.processOutputs[0];
  const run = result.processOutputs[1];

  return successObject({
    success: compile.exitCode === 0 && run?.exitCode === 0,
    stdout: run?.stdout?.toString('utf8') ?? '',
    stderr: run?.stderr?.toString('utf8') ?? '',
    error: compile.exitCode !== 0 ? compile.stderr?.toString('utf8') : undefined
  });
};
