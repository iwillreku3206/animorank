import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/zenstack';
import { TestCaseService } from '$lib/testCase/testCaseService';
import type { ProblemTestCase } from '$lib/zenstack/models';

export const load: PageServerLoad = async ({ locals, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return redirect(302, '/');

  const problem = await db.problem.findUnique({
    where: {
      id: params.slug,
      problem_set: {
        OR: [
          { collaborators: { some: { collaborator_id: session.user.id } } },
          { subscriptions: { some: { student_id: session.user.id } } },
          { is_global: true }
        ]
      }
    }
  });

  if (!problem) return redirect(302, '/');

  const testCaseService = TestCaseService.instance();
  const testCaseInstances = await testCaseService.findByProblem({
    problemId: problem.id,
    user: session.user
  });
  const testCases = testCaseInstances
    .map((tc) => tc.dbTestCase)
    .sort((a, b) => a.created_at.getTime() - b.created_at.getTime()) as ProblemTestCase[];

  return {
    problem,
    testCases,
    user: session.user
  };
};
