import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/zenstack';
import { TestCaseService } from '$lib/testCase/testCaseService';
import { ServerRegistryProvider } from '$lib/registry/server';
import { TagService } from '$lib/tag';
import { toJsonValue } from '$lib/types/utils';

export const load: PageServerLoad = async ({ locals, params }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return redirect(302, '/');

  const serviceProvider = ServerRegistryProvider.instance();

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

  const testCases = await (
    await serviceProvider.getService(TestCaseService)
  ).findByProblemForEdit({
    problemId: problem.id,
    user: session.user
  });

  const tags = await (await serviceProvider.getService(TagService)).findAll();

  return {
    problem,
    topics: topics.map((t) => t.tag_id),
    testCases: testCases.map((tc) => ({ ...tc.testCase.model, data: toJsonValue(tc.testCase.data) })),
    tags: tags.map((tag) => tag.model),
    user: session.user
  };
};
