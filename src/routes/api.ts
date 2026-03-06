export async function createProblem(problemSet: string): Promise<string | undefined> {
  const req = await fetch("/api/problem", {
    method: 'POST',
    body: JSON.stringify({
      problemSet
    }),
    headers: {
      'content-type': 'application/json'
    }
  })

  const res = await req.json()

  return res.id
}
