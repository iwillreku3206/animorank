import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { canViewAnalytics } from '$lib/analytics/access';

export const load: LayoutServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user.id) throw redirect(302, '/');

  // Analytics spans every class in the course, so it is the operator's view:
  // a teacher account needs the admin flag, not just the teacher record.
  if (!canViewAnalytics(session.user)) throw redirect(302, '/');
};
