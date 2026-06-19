import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/zenstack';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session) {
    throw redirect(303, '/auth/signin'); // Or wherever your sign-in page is
  }

  if (session.user.hasAcceptedTOS) {
    throw redirect(303, '/');
  }

  return {
    session
  };
};

export const actions: Actions = {
  accept: async ({ locals }) => {
    const session = await locals.auth();
    if (!session?.user.id) {
      return error(401, 'Unauthorized');
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { hasAcceptedTOS: true }
    });

    throw redirect(303, '/problemSets');
  },

  revoke: async ({ locals }) => {
    const session = await locals.auth();
    if (!session?.user.id) {
      return error(401, 'Unauthorized');
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { hasAcceptedTOS: false }
    });

    throw redirect(303, '/tos');
  },

  deleteAccount: async ({ locals }) => {
    const session = await locals.auth();
    if (!session?.user.id) {
      return error(401, 'Unauthorized');
    }

    await db.user.delete({
      where: { id: session.user.id }
    });

    throw redirect(303, '/');
  }
};
