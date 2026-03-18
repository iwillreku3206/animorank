import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/zenstack";

export const load: PageServerLoad = async ({ locals, params }) => {
  const session = await locals.auth()

  if (!session || !session.user.id) return redirect(302, "/")

  const problem = await db.problem.findUnique({
    where: { id: params.slug },
    include: { problem_set: { select: { owner_id: true } } }
  })

  if (!problem) return redirect(302, "/")
  const { problem_set, ...rest } = problem
  if (problem_set.owner_id !== session.user.id) return redirect(302, "/")

  const testCases = await db.problemTestCase.findMany({
    where: { problem_id: problem.id },
    orderBy: { created_at: "asc" },
  })

  return {
    problem: rest,
    testCases,
    user: session.user,
  }
}
