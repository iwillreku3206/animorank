import StudentPsBox from '$lib/components/StudentPSBox.svelte';
import { supabase } from '$lib/supabaseClient';
import type { RequestHandler } from '../$types';
import { z } from 'zod'

const validator = z.object({
  student_email: z.email(),
  id: z.int(),
  history: z.string(),
  last_state: z.string()
})

export const POST: RequestHandler = async (event) => {
  const body = await event.request.json()

  const { success, data: bodyData, error: zodError } = await validator.safeParseAsync(body)

  if (!success) {
    return new Response(JSON.stringify(zodError), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    })
  }

  const { data, error } = await supabase
    .from('Session')
    .upsert({
      student_email: bodyData.student_email,
      problem_id: bodyData.id,
      history: bodyData.history,
      last_state: bodyData.last_state,
    });

  if (error) {
    return new Response(JSON.stringify(error), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  } else {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
