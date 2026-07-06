import type { TestCaseResult } from '$lib/testCase/testCase';

export type TestRunResponse = { results: TestCaseResult[] };

export async function runTestCases(session_id: string): Promise<TestRunResponse> {
  const req = await fetch(`/api/practice-session/${session_id}/run`, {
    method: 'POST',
    body: JSON.stringify({
      test_type: 'public'
    }),
    headers: {
      'content-type': 'application/json'
    }
  });

  const res = await req.json();

  return res as TestRunResponse;
}

export async function submit(session_id: string): Promise<TestRunResponse> {
  const req = await fetch(`/api/practice-session/${session_id}/run`, {
    method: 'POST',
    body: JSON.stringify({
      test_type: 'all'
    }),
    headers: {
      'content-type': 'application/json'
    }
  });

  const res = (await req.json()) as TestRunResponse;

  return res;
}

export type CustomRunResponse = {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
};

export async function runCustomInput(
  session_id: string,
  stdin: string
): Promise<CustomRunResponse> {
  const req = await fetch(`/api/practice-session/${session_id}/custom-run`, {
    method: 'POST',
    body: JSON.stringify({ stdin }),
    headers: {
      'content-type': 'application/json'
    }
  });

  const res = await req.json();
  return res as CustomRunResponse;
}
