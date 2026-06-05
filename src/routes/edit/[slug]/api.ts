import type { Language } from '$lib/zenstack/models';

export interface UpdatePayload {
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

export async function saveProblem(problemId: string, updates: UpdatePayload) {
  await fetch(`/api/problem/${problemId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
