/**
 * `fetch` only rejects on network failure, so a 4xx/5xx has to be raised by
 * hand or the caller treats a refused write as a success.
 */
async function assertOk(response: Response, what: string): Promise<void> {
  if (!response.ok) {
    throw new Error(`${what} failed: ${response.status} ${response.statusText}`);
  }
}

/** Create an empty problem set and return its id. */
export async function createProblemSet(title: string): Promise<string> {
  const response = await fetch('/api/problem-set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  await assertOk(response, 'Creating problem set');
  const { id } = await response.json();
  return id;
}

export async function deleteProblemSet(problemSetId: string): Promise<void> {
  const response = await fetch(`/api/problem-set/${problemSetId}`, { method: 'DELETE' });
  await assertOk(response, 'Deleting problem set');
}
