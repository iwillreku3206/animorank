import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/zenstack';
import { TestCaseService } from '$lib/testCase/testCaseService';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { TagService } from '$lib/tag';

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

  const tags = await serviceProvider.getService(TagService).findAll();

  return {
    problem,
    topics: topics.map((t) => t.tag_id),
    testCases,
    tags: tags.map((tag) => tag.model),
    user: session.user
  };
};
