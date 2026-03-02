import { supabase } from '$lib/supabaseClient';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

const getPSETProblemsValidator = z.object({
  action: z.literal('getPSETProblems'),
  psetId: z.string()
});

const updateProblemVisibilityValidator = z.object({
  action: z.literal('updateProblemVisibility'),
  id: z.number(),
  visible: z.boolean()
});

const validator = z.discriminatedUnion('action', [
  getPSETProblemsValidator,
  updateProblemVisibilityValidator
]);

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();

  const { success, data: bodyData, error: zodError } = await validator.safeParseAsync(body);

  if (!success) {
    return new Response(JSON.stringify(zodError), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (bodyData.action == 'getPSETProblems') {
    const { data, error } = await supabase
      .from('Problem')
      .select('id, problem_name, language')
      .eq('problem_set', bodyData.psetId);

    return json({
      data: data?.map((d) => ({ ...d, visible: true })),
      error: error
    });
  } else if (bodyData.action == 'updateProblemVisibility') {
    const { data, error } = await supabase
      .from('Problem')
      .update({ visible: bodyData.visible })
      .eq('id', bodyData.id);

    return json({
      data: data,
      error: error
    });
  } else {
    return json({
      error: 'Unknown action type'
    });
  }
};
