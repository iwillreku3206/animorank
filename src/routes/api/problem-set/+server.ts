import z from 'zod';
import type { RequestHandler } from './$types';
import { error, successObject } from '$lib/response';
import { ServerServiceProvider } from '$lib/services/serverServiceProvider';
import { ProblemSetService } from '$lib/problemSet/problemSetService';

const postValidator = z.object({
  title: z.string().min(1)
});

export const POST: RequestHandler = async ({ locals, request }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');
  if (session.user.type != 'teacher') return error(403, 'Unauthorized');

  const {
    success,
    data,
    error: zodError
  } = await postValidator.safeParseAsync(await request.json());

  if (!success) return error(400, zodError);

  const problemSetService = ServerServiceProvider.instance().getService(ProblemSetService);

  const problemSet = await problemSetService.create({
    title: data.title,
    collaboratorId: session.user.id
  });

  if (!problemSet) return error(500, 'Failed to create problem set');

  return successObject({ id: problemSet.id });
};

const listValidator = z.object({
  search: z.string().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional()
});

export const GET: RequestHandler = async ({ locals, url }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) return error(403, 'Unauthorized');

  const params = url.searchParams;
  const {
    success,
    data,
    error: zodError
  } = await listValidator.safeParseAsync({
    search: params.get('search'),
    page: params.get('page') ? parseInt(params.get('page')!, 10) : undefined,
    pageSize: params.get('pageSize') ? parseInt(params.get('pageSize')!, 10) : undefined
  });

  if (!success) return error(400, zodError);

  const problemSetService = ServerServiceProvider.instance().getService(ProblemSetService);

  const result = await problemSetService.findByUser({
    user: session.user,
    search: data.search,
    page: data.page,
    pageSize: data.pageSize
  });

  return successObject(result);
};
