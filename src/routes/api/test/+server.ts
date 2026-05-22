import { successObject } from '$lib/response';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();

  return successObject({ session });
};
