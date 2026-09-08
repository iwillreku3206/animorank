import type { RequestHandler } from './$types';
import { z } from 'zod';
import type { SessionHistoryEntryCreateManyArgs } from '$lib/zenstack/input';
import { db } from '$lib/zenstack';

const validator = z.array(
  z.object({
    // JSON bodies carry timestamps as ISO strings (Date instances do not
    // survive JSON serialization), so coerce rather than require a Date.
    timestamp: z.coerce.date(),
    type: z.string(),
    data: z.any(),
    session_id: z.uuid()
  })
);

export const POST: RequestHandler = async ({ locals, request }) => {
  const session = await locals.auth();

  if (!session) {
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

  await db.sessionHistoryEntry.createMany({
    data: bodyData.map(
      (event) =>
        ({
          data: event.data,
          practice_session_id: event.session_id,
          type: event.type,
          timestamp: event.timestamp
        }) satisfies SessionHistoryEntryCreateManyArgs['data']
    )
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
