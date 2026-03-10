import { error, successObject } from "$lib/response";
import { db } from "$lib/zenstack";
import type { RequestHandler } from "./$types";

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth()
  if (!session || !session.user.id) return error(403, "Unauthorized")

  const testCase = await db.problemTestCase.deleteMany({ where: { id: params.id, problem: { problem_set: { owner_id: session.user.id } } } })

  if (testCase.count === 0) return error(404, "Not found")

  return successObject({ status: "Success" })
}
