import type { TestCaseResult } from '$lib/testCase/testCase';
import type { ProblemTestCase } from '$lib/zenstack/models';

type TestCaseInfo = ProblemTestCase | { id: ProblemTestCase['id'] };

export type TestRunResponse = { results: TestCaseResult[] };

export async function runTestCases(session_id: string, code: string): Promise<TestRunResponse> {
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

  return res as TestRunResponse;
}
