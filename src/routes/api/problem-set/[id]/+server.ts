import { error, successObject } from '$lib/response';
import z from 'zod';
import type { RequestHandler } from './$types';
import { db } from '$lib/zenstack';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { ProblemSetService } from '$lib/problemSet/problemSetService';
import { TestCaseService } from '$lib/testCase/testCaseService';

export const GET: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const problemSetService = ServerServiceProvider.instance().getService(ProblemSetService);

  // Use service to verify access
  const problemSet = await problemSetService.findById({
    id: params.id,
    user: session.user
  });

  if (!problemSet) return error(404, 'Not found');

  // Query with the specific includes needed for this endpoint
  const fullProblemSet = await db.problemSet.findUnique({
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
      collaborators: { include: { collaborator: { include: { user: true } } } },
      difficulty: true,
      subject: true,
      topics: { include: { topic_tag: true } }
    }
  });

  if (!fullProblemSet) return error(404, 'Not found');

  const testCaseService = ServerServiceProvider.instance().getService(TestCaseService);

  return successObject({
    id: fullProblemSet.id,
    title: fullProblemSet.title,
    description: fullProblemSet.description || undefined,
    global: fullProblemSet.is_global,
    auto_accept: fullProblemSet.auto_accept,
    problems: await Promise.all(
      fullProblemSet.problems.map(async (problem) => {
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
    teachers: fullProblemSet.collaborators.map((c) => ({
      id: c.collaborator.user.id,
      name: c.collaborator.user.name
    })),
    subject: fullProblemSet.subject || undefined,
    difficulty: fullProblemSet.difficulty || undefined,
    topics: fullProblemSet.topics.map((t) => t.topic_tag),
    created_at: fullProblemSet.created_at,
    updated_at: fullProblemSet.updated_at
  });
};

const updateValidator = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  auto_accept: z.stringbool().optional(),
  is_global: z.stringbool().optional(),
  subjectId: z.string().uuid().nullish(),
  difficultyId: z.string().uuid().nullish()
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

  const problemSetService = ServerServiceProvider.instance().getService(ProblemSetService);

  const updated = await problemSetService.update({
    id: params.id,
    user: session.user,
    data: {
      title: data.title,
      description: data.description,
      auto_accept: data.auto_accept,
      is_global: data.is_global,
      subject_id: data.subjectId,
      difficulty_id: data.difficultyId
    }
  });

  if (!updated) return error(403, 'Not authorized or not found');

  return successObject({ status: 'success' });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const problemSetService = ServerServiceProvider.instance().getService(ProblemSetService);

  const deleted = await problemSetService.delete({
    id: params.id,
    user: session.user
  });

  if (!deleted) return error(404, 'Not found or not authorized');

  return successObject({ status: 'success' });
};
