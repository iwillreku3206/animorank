import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/prisma";

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.auth()

  if (!session || !session.user.id) redirect(302, '/about')

  const problem = await prisma.problem.findUnique({ where: { id: params.slug, problem_set: { subscriptions: { some: { student_id: session.user.id } } } }, include: { practice_sessions: { where: { student_id: session.user.id } } } })

  // TODO: copy in starter code if no practice session

  return { problem }
}
