import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();

  // The landing page is shown to everyone; signed-in users just get the
  // "Go to your problem sets" CTA instead of the sign-in prompt.
  return {
    user: session?.user
  };
};
