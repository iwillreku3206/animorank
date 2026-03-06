import StudentPsBox from '$lib/components/StudentPSBox.svelte';
import { fail } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod'
import { prisma } from '$lib/prisma';
import { HistoryEntryType } from '../../../../generated/prisma/enums';
import type { PracticeHistoryEntryCreateManyInput, PracticeSessionCreateManyInput } from '../../../../generated/prisma/models';

const validator = z.array(z.object({
  timestamp: z.date(),
  type: z.enum(Object.values(HistoryEntryType)),
  data: z.any(),
  session_id: z.uuid()
}))

export const POST: RequestHandler = async ({ locals, request }) => {
  const session = await locals.auth()

  if (!session) {
    return new Response(JSON.stringify({ error: "Not signed in" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    })
  }

  const body = await request.json()

  const { success, data: bodyData, error: zodError } = await validator.safeParseAsync(body)

  if (!success) {
    return new Response(JSON.stringify(zodError), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    })
  }

  await prisma.practiceHistoryEntry.createMany({ data: bodyData.map(event => ({ data: event.data, practice_session_id: event.session_id, type: event.type, timestamp: event.timestamp }) satisfies PracticeHistoryEntryCreateManyInput) })


  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
