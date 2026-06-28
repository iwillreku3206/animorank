import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url, locals }) => {
  const session = await locals.auth();

  if (session) {
    if (
      session?.user &&
      !session.user.hasAcceptedTOS &&
      !(url.pathname.startsWith('/accept-terms') || url.pathname.startsWith('/legal'))
    ) {
      throw redirect(303, '/accept-terms');
    }
  }

  return {
    user: session?.user
  };
};
