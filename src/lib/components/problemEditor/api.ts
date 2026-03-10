import type { ProblemTestCaseType } from "../../../../zenstack/models"

export async function createTestCase(problem: string, type: ProblemTestCaseType): Promise<string | undefined> {
  const req = await fetch("/api/test-case", {
    method: 'POST',
    body: JSON.stringify({
      problem,
      type
    }),
    headers: {
      'content-type': 'application/json'
    }
  })

  const res = await req.json()

  return res.id
}

export async function deleteTestCase(id: string): Promise<boolean> {
  const req = await fetch(`/api/test-case/${id}`, {
    method: 'DELETE',
  })

  const res = await req.json()

  return res.status === "Success"
}
