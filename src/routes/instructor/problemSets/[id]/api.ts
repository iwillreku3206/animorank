import type { Problem, ProblemSet } from '$lib/zenstack/models';

/**
 * `fetch` only rejects on network failure, so a 4xx/5xx has to be raised by
 * hand — otherwise the autosave reports a rejected save as 'saved'.
 */
async function assertOk(response: Response, what: string): Promise<void> {
  if (!response.ok) {
    throw new Error(`${what} failed: ${response.status} ${response.statusText}`);
  }
}

export type SaveProblemSetPayload = Partial<Omit<ProblemSet, 'id'>> & {
  topic_ids?: string[];
};

export async function saveProblemSet(problemSetId: string, updates: SaveProblemSetPayload): Promise<void> {
  const response = await fetch(`/api/problem-set/${problemSetId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: updates.title,
      description: updates.description,
      auto_accept: updates.auto_accept,
      is_global: updates.is_global,
      subject_id: updates.subject_id,
      difficulty_id: updates.difficulty_id,
      topic_ids: updates.topic_ids
    })
  });
  await assertOk(response, 'Saving problem set');
}

export async function addProblem(problemSetId: string): Promise<Problem> {
  const response = await fetch('/api/problem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problemSet: problemSetId })
  });
  await assertOk(response, 'Adding problem');
  return response.json();
}

export interface UpdateProblemPayload {
  name?: string;
  description?: string;
  visible?: boolean;
  starter_code?: string;
  uses_slots?: boolean;
  difficulty_id?: string | null;
  subject_id?: string | null;
}

export async function saveProblem(problemId: string, updates: UpdateProblemPayload): Promise<void> {
  const response = await fetch(`/api/problem/${problemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  await assertOk(response, 'Saving problem');
}

export async function deleteProblem(problemId: string): Promise<void> {
  const response = await fetch(`/api/problem/${problemId}`, { method: 'DELETE' });
  await assertOk(response, 'Deleting problem');
}
