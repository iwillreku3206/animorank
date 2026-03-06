import { redirect } from '@sveltejs/kit';
import { OAuth2Client } from 'google-auth-library';
import { BASE_URL, SECRET_CLIENT_ID, SECRET_CLIENT_SECRET } from '$env/static/private';
import type { Actions, PageServerLoad } from "./$types";
import { prisma } from "$lib/prisma";

import { type ProblemSet } from '../../+page.server'
export { type ProblemSet }

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.auth()

  if (!session || !session.user.id) redirect(302, '/about')

  const { slug } = params;

  const problemSet = await prisma.problemSet.findUnique({ where: { id: slug, is_global: true, problems: { some: { visible: true } } }, include: { problems: true, owner: { include: { user: true } } } })


  return {
    pset: problemSet ? {
      id: problemSet.id,
      title: problemSet?.title,
      description: problemSet.description || undefined,
      global: problemSet?.is_global,
      problems: problemSet?.problems.map(problem => ({ id: problem.id, name: problem.name, visible: problem.visible })),
      teacher: problemSet.owner ? { id: problemSet.owner.id, name: problemSet.owner.user.name || '' } : undefined
    } satisfies ProblemSet : undefined,
    user: session?.user,
  }
};
