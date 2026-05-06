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

  // TODO: Add verification if the student is "allowed" to subscribe to this problem set

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
