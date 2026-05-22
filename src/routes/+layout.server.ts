import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url, locals }) => {
  const session = await locals.auth();

  if (session) {
    if (
      session?.user &&
      !session.user.hasAcceptedTOS &&
      !(url.pathname.startsWith('/tos') || url.pathname.startsWith('/legal'))
    ) {
      throw redirect(303, '/tos');
    }
  }

  return {
    user: session?.user
  };
};
