import type { JsonValue } from '@zenstackhq/orm';
import type { Language, ProblemTestCase } from '$lib/zenstack/models';

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
  extension_data?: JsonValue;
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

export async function deleteTestCase(testCaseId: string) {
  await fetch(`/api/test-case/${testCaseId}`, {
    method: 'DELETE'
  });
}

export async function createTestCase(problem: string, type: string): Promise<ProblemTestCase | undefined> {
  const req = await fetch('/api/test-case', {
    method: 'POST',
    body: JSON.stringify({
      problem,
      type
    }),
    headers: {
      'content-type': 'application/json'
    }
  });

  const res = await req.json();

  return res;
}

export async function updateTestCase(testCase: ProblemTestCase): Promise<boolean> {
  const req = await fetch(`/api/test-case/${testCase.id}`, {
    method: 'PUT',
    body: JSON.stringify(testCase)
  });

  const res = await req.json();
  console.log(res.status, res.status === 'Success');
  return res.status === 'Success';
}
