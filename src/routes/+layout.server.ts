import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const auth = await locals.auth();

	return {
		user: auth?.user
	};
};
