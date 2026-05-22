import { error, successObject } from '$lib/response';
import z from 'zod';
import type { RequestHandler } from './$types';
import { db } from '$lib/zenstack';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { TestCaseService } from '$lib/testCase/testCaseService';

export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const problemSet = await db.problemSet.findUnique({
    where: {
      id: params.id,
      OR: [
        { is_global: true },
        { subscriptions: { some: { student_id: session.user.id } } },
        { collaborators: { some: { collaborator_id: session.user.id } } }
      ]
    },
    include: {
      problems: true,
      collaborators: { include: { collaborator: { include: { user: true } } } }
    }
  });

  if (!problemSet) return error(404, 'Not found');

  const testCaseService = ServerServiceProvider.instance().getService(TestCaseService);

  return successObject({
    id: problemSet.id,
    title: problemSet.title,
    description: problemSet.description || undefined,
    global: problemSet.is_global,
    problems: await Promise.all(
      problemSet.problems.map(async (problem) => {
        const testCases = await testCaseService.findByProblem({
          problemId: problem.id,
          user: session.user
        });

        return {
          id: problem.id,
          name: problem.name,
          visible: problem.visible,
          testCases: testCases.map((tc) => tc.dbTestCase)
        };
      })
    ),
    teachers: problemSet.collaborators.map((c) => ({
      id: c.collaborator.user.id,
      name: c.collaborator.user.name
    }))
  });
};

const updateValidator = z.object({
  title: z.string().optional(),
  desciption: z.string().optional(),
  auto_accept: z.stringbool().optional(),
  is_global: z.stringbool().optional()
});

export const PUT: RequestHandler = async ({ locals, request, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const {
    success,
    data,
    error: zodError
  } = await updateValidator.safeParseAsync(await request.json());

  if (!success) return error(400, zodError);

  await db.problemSet.update({
    where: { id: params.id, collaborators: { some: { collaborator_id: session.user.id } } },
    data
  });

  return successObject({ status: 'success' });
};
