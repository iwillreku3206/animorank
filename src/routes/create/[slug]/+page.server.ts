import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions } from './$types';
import { db } from '$lib/zenstack';

const createProblemValidator = z.object({
  problem_name: z.string().min(1),
  body: z.string().min(1),
  test_function: z.string().min(1),
  starter_code: z.string().min(1),
  language: z.literal('C')
});

export const actions: Actions = {
  createProblem: async ({ request, params, locals }) => {
    const session = await locals.auth();

    if (!session || !session.user.id) redirect(302, '/about');

    if (session.user.type !== 'teacher') {
      return fail(403, { error: 'You are not allowed to edit a problem set' });
    }

    const formData = await request.formData();

    const { slug } = params;

    // TODO: Handle test cases
    const test_cases = formData.get('test_cases');

    const input = {
      problem_name: formData.get('title'),
      body: formData.get('description'),
      test_function: formData.get('test_function'),
      starter_code: formData.get('starterCode'),
      language: 'C'
    };

    const { success, data, error } = await createProblemValidator.safeParseAsync(input)

    if (!success) return fail(400, { error })

    const problemSet = await db.problemSet.findUnique({ where: { id: slug } });

    if (problemSet?.owner_id != session.user.id) {
      return fail(403, { error: 'You are not allowed to edit this problem set' });
    }

    db.problem.create({ data: { name: data.problem_name, description: data.body, language: data.language, problem_set_id: params.slug } });

    return {
      data: 'success',
      error: null
    };
  }
};
