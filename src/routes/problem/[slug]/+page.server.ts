import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types";
import { db } from '$lib/zenstack';

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.auth()

  if (!session || !session.user.id) redirect(302, '/about')

  const problem = await db.problem.findUnique({ where: { id: params.slug, problem_set: { subscriptions: { some: { student_id: session.user.id } } } }, include: { practice_sessions: { where: { student_id: session.user.id } } } })

  // TODO: copy in starter code if no practice session

  return { problem }
}
