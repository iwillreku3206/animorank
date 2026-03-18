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

	let practiceSessionId: string;

	const practiceSession = await db.practiceSession.findFirst({
		where: { problem_id: params.problem_id, done: false }
	});

	if (practiceSession) {
		practiceSessionId = practiceSession.id;
	} else {
		const newPracticeSession = await db.practiceSession.create({
			data: {
				student_id: session.user.id,
				problem_id: problem.id,
				previous_code: problem.starter_code
			}
		});
		practiceSessionId = newPracticeSession.id;
	}

	console.log('redirecting');

	throw redirect(302, `/problem2/${params.problem_id}/${practiceSessionId}`);
};
