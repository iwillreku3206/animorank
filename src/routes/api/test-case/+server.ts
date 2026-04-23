import { error, successObject } from "$lib/response";
import z from "zod";
import type { RequestHandler } from "./$types";
import { db } from "$lib/zenstack";
import { ProblemTestCaseType } from "$lib/zenstack/models";
import type { FunctionOutputTestCaseCreateArgs, FunctionOutputTestCaseSelect } from "$lib/zenstack/input";

const postValidator = z.object({
  problem: z.uuid(),
  type: z.enum(Object.values(ProblemTestCaseType))
})

export const POST: RequestHandler = async ({ locals, request }) => {
  const session = await locals.auth()
  if (!session || !session.user.id) return error(403, "Unauthorized")

  const { success, data, error: zodError } = await postValidator.safeParseAsync(await request.json())
  if (!success) return error(400, zodError)

  const problem = await db.problem.findUnique({ where: { id: data.problem }, select: { id: true, problem_set: true } })
  if (!problem || problem.problem_set.owner_id !== session.user.id) return error(404, "Not found")

  let id: string | undefined;

  const creationOperation = {
    data: { problem_id: data.problem },
  }

  switch (data.type) {
    case "FunctionOutputTestCase":
      return successObject(await db.functionOutputTestCase.create(creationOperation))
    case "ProgramIOTestCase":
      return successObject(await db.programIOTestCase.create(creationOperation))
    case "CustomTestCase":
      return successObject(await db.customTestCase.create(creationOperation))
  }
}
