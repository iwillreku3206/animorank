import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url, locals }) => {
  const session = await locals.auth();

  if (session) {
    const { user } = session

    if (session?.user && !session.user.hasAcceptedTOS && !url.pathname.startsWith('/tos')) {
      throw redirect(303, '/tos');
    }
  }

  return {
    user: session?.user
  };
};
