import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { prisma } from "$lib/prisma";

export const load: PageServerLoad = async ({ locals, params }) => {
  const session = await locals.auth()

  if (!session || !session.user.id) return redirect(302, "/")

  const problem = await prisma.problem.findUnique({ where: { id: params.slug }, include: { problem_set: { select: { owner_id: true } } } })
  if (!problem) return redirect(302, "/")
  const { problem_set, ...rest } = problem
  if (problem_set.owner_id !== session.user.id) return redirect(302, "/")

  const testCases = await prisma.problemTestCase.findMany({ where: { problem_id: problem.id } })

  return {
    problem: rest,
    testCases,
    user: session.user,
  }
}
