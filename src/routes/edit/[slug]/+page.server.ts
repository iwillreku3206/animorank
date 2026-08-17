import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/zenstack';
import { TestCaseService } from '$lib/testCase/testCaseService';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { TagService } from '$lib/tag';
import { ServerTestCaseRegistry } from '$lib/testCase/testCaseRegistry.server';
import { Problem } from '$lib/problem';
import { toJsonValue } from '$lib/types/utils';

export const load: PageServerLoad = async ({ locals, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return redirect(302, '/');

  const serviceProvider = ServerServiceProvider.instance();

  const problemResult = await db.problem.findUnique({
    where: {
      id: params.slug,
      problem_set: {
        OR: [
          { collaborators: { some: { collaborator_id: session.user.id } } },
          { subscriptions: { some: { student_id: session.user.id } } },
          { is_global: true }
        ]
      }
    },
    include: {
      topics: true
    }
  });

  if (!problemResult) return redirect(302, '/');

  const { topics, ...problem } = problemResult;

  const testCases = await TestCaseService.instance().findByProblem({
    problemId: problem.id,
    user: session.user
  });
  testCases
    .map((tc) => {
      try {
        return ServerTestCaseRegistry.instance().from(tc, new Problem(problem));
      } catch (error) {
        return null;
      }
    })
    .filter((t) => !!t)
    .forEach((t) => {
      try {
        console.log(t.languageRegistry.getInstance('c', t).generateCode()[0]);
      } catch (error) {
        console.log(error);
      }
    });

  const tags = await serviceProvider.getService(TagService).findAll();

  return {
    problem,
    topics: topics.map((t) => t.tag_id),
    testCases: testCases.map((tc) => ({ ...tc, data: toJsonValue(tc.data) })),
    tags: tags.map((tag) => tag.model),
    user: session.user
  };
};
