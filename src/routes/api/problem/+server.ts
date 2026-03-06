import z from "zod";
import type { RequestHandler } from "./$types";
import { error, successObject } from "$lib/response";
import { prisma } from "$lib/prisma";
import { DEFAULT_PROBLEM } from "$lib/constants";

const postValidator = z.object({
  problemSet: z.uuid()
})

export const POST: RequestHandler = async ({ locals, request }) => {
  const session = await locals.auth()
  if (!session) return error(403, "Unauthorized")
  if (session.user.type != "teacher") return error(403, "Unauthorized")

  const { success, data, error: zodError } = await postValidator.safeParseAsync(await request.json())
  if (!success) return error(400, zodError)

  const problemSet = await prisma.problemSet.findUnique({ where: { id: data.problemSet }, select: { owner_id: true } })
  if (!problemSet || problemSet.owner_id !== session.user.id) return error(404, "Not found")

  const creation = await prisma.problem.create({
    data: {
      ...DEFAULT_PROBLEM,
      problem_set_id: data.problemSet
    },
    select: { id: true }
  })

  return successObject({ id: creation.id })
}
