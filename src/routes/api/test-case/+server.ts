import { error, successObject } from "$lib/response";
import z from "zod";
import type { RequestHandler } from "./$types";
import { prisma } from "$lib/prisma";
import { create } from "domain";
import { DEFAULT_TEST_CASE } from "$lib/constants";

const postValidator = z.object({
  problem: z.uuid()
})

export const POST: RequestHandler = async ({ locals, request }) => {
  const session = await locals.auth()
  if (!session || !session.user.id) return error(403, "Unauthorized")

  const { success, data, error: zodError } = await postValidator.safeParseAsync(await request.json())
  if (!success) return error(400, zodError)

  const problem = await prisma.problem.findUnique({ where: { id: data.problem }, select: { id: true, problem_set: true } })
  if (!problem || problem.problem_set.owner_id !== session.user.id) return error(404, "Not found")

  const creation = await prisma.problemTestCase.create({
    data: { ...DEFAULT_TEST_CASE, problem_id: data.problem },
    select: { id: true }
  })

  return successObject({ id: creation.id })
}
