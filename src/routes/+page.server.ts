import { fail, redirect } from '@sveltejs/kit';
import { auth, OAuth2Client } from 'google-auth-library';
import { BASE_URL, SECRET_CLIENT_ID, SECRET_CLIENT_SECRET } from '$env/static/private';
import type { Actions, PageServerLoad } from './$types';
import z from 'zod';
import { db } from '$lib/zenstack';
import { type ProblemSetWhereInput } from '$lib/zenstack/input';
import { testFunctionTestCase } from '$lib/codeExecutor/functionTestCase';

export interface ProblemSet {
  id: string;
  title: string;
  description?: string;
  global: boolean;
  problems: {
    id: string;
    name: string;
    visible: boolean;
  }[];
  teacher?: {
    id: string;
    name: string;
    profile_url?: string;
  };
}

export const load: PageServerLoad = async ({ locals }) => {
  const auth = await locals.auth();

  if (!auth) redirect(302, '/about');

  let filter: ProblemSetWhereInput;

  if (auth.user.type === 'teacher') {
    if (!auth.user.id) return redirect(302, '/about');
    filter = { owner_id: auth.user.id };
  } else if (auth.user.type === 'student') {
    filter = { is_global: true, problems: { some: { visible: true } } };
  } else {
    return redirect(302, '/about');
  }

  const problemSets = await db.problemSet.findMany({
    where: filter,
    include: { problems: true, owner: { include: { user: true } } }
  });

  const returnedProblemSets: ProblemSet[] = problemSets.map((problemSet) => {
    return {
      id: problemSet.id,
      title: problemSet.title,
      description: problemSet.description || undefined,
      global: problemSet.is_global,
      problems: problemSet.problems.map((problem) => {
        return {
          id: problem.id,
          name: problem.name,
          visible: problem.visible
        };
      }),
      teacher: problemSet.owner
        ? {
            id: problemSet.owner?.id,
            name: problemSet.owner?.user.name || '',
            profile_url: problemSet.owner?.user.image || undefined
          }
        : undefined
    };
  });

  return {
    psets: returnedProblemSets
  };
};

const createPsetValidator = z.object({
  title: z.string(),
  description: z.string(),
  auto_accept: z.stringbool().optional().nullable(),
  is_global: z.stringbool().optional().nullable()
});

export const actions: Actions = {
  createPset: async ({ request, locals }) => {
    const session = await locals.auth();

    if (!session) return;
    if (session.user.type !== 'teacher') {
      return fail(400, { error: 'You are not authorized to create a problem.' });
    }

    const formData = await request.formData();
    const input = {
      title: formData.get('title'),
      description: formData.get('description'),
      auto_accept: formData.get('auto_accept') || null,
      is_global: formData.get('is_private') || null
    };

    const validatedData = await createPsetValidator.safeParseAsync(input);

    if (!validatedData.success) {
      return fail(400, { error: validatedData.error.message });
    }

    const data = await db.problemSet.create({
      data: {
        title: validatedData.data.title,
        description: validatedData.data.description,
        owner_id: session.user.id,
        is_global: validatedData.data.is_global ? !validatedData.data.is_global : true,
        auto_accept: validatedData.data.auto_accept || false
      }
    });

    return { data };
  }
};
