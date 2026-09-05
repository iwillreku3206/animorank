import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/zenstack';

const validator = z.object({
  problem_set: z.string()
});

export const POST: RequestHandler = async ({ locals, request }) => {
  const session = await locals.auth();

  if (!session || !session.user.id) {
    return new Response(JSON.stringify({ error: 'Not signed in' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json();

  const { success, data: bodyData, error: zodError } = await validator.safeParseAsync(body);

  if (!success) {
    return new Response(JSON.stringify(zodError), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify the problem set exists and the student is allowed to subscribe.
  // A student can subscribe to global problem sets or those with auto_accept enabled.
  const problemSet = await db.problemSet.findUnique({
    where: { id: bodyData.problem_set },
    select: { id: true, is_global: true, auto_accept: true }
  });

  if (!problemSet) {
    return new Response(JSON.stringify({ error: 'Problem set not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!problemSet.is_global && !problemSet.auto_accept) {
    return new Response(JSON.stringify({ error: 'Not authorized to subscribe to this problem set' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const obj = { problem_set_id: bodyData.problem_set, student_id: session.user.id };
  await db.subscription.upsert({
    create: obj,
    update: {},
    where: { problem_set_id_student_id: obj }
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
