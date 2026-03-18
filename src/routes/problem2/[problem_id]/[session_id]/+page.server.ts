import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/zenstack';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = await locals.auth();

	if (!session || !session.user.id) redirect(302, '/about');

	const problem = await db.problem.findUnique({
		where: {
			id: params.problem_id,
			problem_set: {
				OR: [{ subscriptions: { some: { student_id: session.user.id } } }, { is_global: true }]
			}
		},
		include: { practice_sessions: { where: { student_id: session.user.id } } }
	});
	if (!problem) throw error(404, { message: 'Not Found' });

	const practiceSession = await db.practiceSession.findUnique({
		where: { id: params.session_id }
	});

	if (!practiceSession) throw redirect(302, `/problem2/${params.problem_id}`);

	return { problem, practiceSession };
};
