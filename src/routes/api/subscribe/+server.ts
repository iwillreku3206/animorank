import { supabase } from '$lib/supabaseClient';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '../$types';
import { z } from 'zod';

const validator = z.object({
  student_email: z.string().email(),
  problem_set: z.string()
});

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();

  const { success, data: bodyData, error: zodError } = await validator.safeParseAsync(body);

  if (!success) {
    return new Response(JSON.stringify(zodError), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { data, error } = await supabase.from('Subscription').upsert(
    [
      {
        student_email: bodyData.student_email,
        problem_set: bodyData.problem_set,
        status: 'pending'
      }
    ],
    { onConflict: 'email' }
  );

  if (error) {
    return new Response(JSON.stringify(error), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
