import type { Language, ProblemSet } from '$lib/zenstack/models';

type SaveProblemSetDto = Partial<
  ProblemSet & {
    id: string;
    topic_ids: string[];
  }
>;

export async function saveProblemSet(problemSet: SaveProblemSetDto) {
  await fetch(`/api/problem-set/${problemSet.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: problemSet.title,
      description: problemSet.description,
      auto_accept: problemSet.auto_accept,
      is_global: problemSet.is_global,
      subject_id: problemSet.subject_id,
      difficulty_id: problemSet.difficulty_id,
      topic_ids: problemSet.topic_ids
    })
  });
}

export async function addProblem(problemSetId: string) {
  const res = await fetch(`/api/problem`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      problemSet: problemSetId
    })
  });
  const problem = await res.json();
  return problem;
}

export interface UpdatePayload {
  id: string;
  name?: string;
  description?: string;
  visible?: string | boolean;
  starter_code?: string;
  uses_slots?: boolean;
  language?: Language;
  difficulty_id?: string | null;
  subject_id?: string | null;
  topics?: string[];
}

export async function saveProblem(updates: UpdatePayload) {
  await fetch(`/api/problem/${updates.id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
