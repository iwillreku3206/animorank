import { prisma } from "$lib/prisma";
import { error, successObject } from "$lib/response";
import type { RequestHandler } from "./$types";

export const DELETE: RequestHandler = async ({ locals, params }) => {
  const session = await locals.auth()
  if (!session || !session.user.id) return error(403, "Unauthorized")

  const testCase = await prisma.problemTestCase.deleteMany({ where: { id: params.id, problem: { problem_set: { owner_id: session.user.id } } } })

  if (testCase.count === 0) return error(404, "Not found")

  return successObject({ status: "Success" })
}
