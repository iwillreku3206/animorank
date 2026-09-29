import z from 'zod';
import type { RequestHandler } from './$types';
import { db } from '$lib/zenstack';
import { PracticeSessionService } from '$lib/practiceSession/practiceSessionService';
import { ServerRegistryProvider } from '$lib/registry/server';
import { error, successObject } from '$lib/response';
import type { JsonValue } from '@zenstackhq/orm';

const extensionDataValidator = z
  .unknown()
  .refine((d): d is Record<string, unknown> => typeof d === 'object' && d !== null && !Array.isArray(d), {
    message: 'extension_data must be a JSON object'
  })
  .optional();

const updateSessionValidator = z.object({
  code: z.record(z.string(), z.string()).optional(),
  extension_data: extensionDataValidator
});

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const session = await locals.auth();
  if (!session) return error(403, 'Unauthorized');

  const { success, error: zodError, data } = await updateSessionValidator.safeParseAsync(await request.json());
  if (!success) return error(400, zodError);

  const { code, extension_data } = data;

  // The merge below needs the stored value, and this read is where ownership is
  // checked: a session that is not the student's own is not found at all.
  const existing = await db.practiceSession.findUnique({
    where: { id: params.id, student_id: session.user.id || '' },
    select: { extension_data: true }
  });
  if (!existing) return error(404, 'Not found');

  // A JSON column is replaced whole, not patched, so merge the payload into the
  // stored value: a plugin writing its own key must never wipe another
  // extension's. `undefined` means the request said nothing about it.
  const stored = existing.extension_data;
  const storedObject =
    typeof stored === 'object' && stored !== null && !Array.isArray(stored) ? (stored as Record<string, unknown>) : {};
  const mergedExtensionData = extension_data !== undefined ? { ...storedObject, ...extension_data } : undefined;

  const service = await ServerRegistryProvider.instance().getService(PracticeSessionService);

  const update = await service.update({
    id: params.id,
    user: session.user,
    newState: {
      ...(code !== undefined && { previous_state: { code } as JsonValue }),
      ...(mergedExtensionData !== undefined && { extension_data: mergedExtensionData as JsonValue })
    }
  });

  return update ? successObject({ status: 'success' }) : error(404, 'Not found');
};
