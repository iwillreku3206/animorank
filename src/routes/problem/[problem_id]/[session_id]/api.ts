import type { TestCaseResult } from '$lib/types/codeExecution';

export async function runTestCases(session_id: string, code: string): Promise<TestCaseResult[]> {
  const req = await fetch(`/api/practice-session/${session_id}/run`, {
    method: 'POST',
    body: JSON.stringify({
      code,
      test_type: 'public'
    }),
    headers: {
      'content-type': 'application/json'
    }
  });

  const res = await req.json();

  return res.results as TestCaseResult[];
}
