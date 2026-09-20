import { errorFrom } from '$lib/response';

/** Create an empty problem set and return its id. */
export async function createProblemSet(title: string): Promise<string> {
  const response = await fetch('/api/problem-set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!response.ok) throw await errorFrom(response, 'Creating problem set failed');
  const { id } = await response.json();
  return id;
}

export async function deleteProblemSet(problemSetId: string): Promise<void> {
  const response = await fetch(`/api/problem-set/${problemSetId}`, { method: 'DELETE' });
  if (!response.ok) throw await errorFrom(response, 'Deleting problem set failed');
}
