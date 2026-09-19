import type { TestCaseResult } from '$lib/testCase/types';
import type { FunctionTestCaseRunInfo } from '$lib/testCase/builtin/functionTestCase/functionTestCase.svelte';
import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
import type { TestCase } from '$lib/testCase/testCase.svelte';
import type { Problem } from '$lib/problem';
import type { ProblemTestCase } from '$lib/zenstack/models';

export type TestRunResponse = {
  results: (TestCaseResult<FunctionTestCaseRunInfo> & { testCase?: TestCase })[];
  success: boolean;
  recorded?: boolean;
};

function hydrateResults(
  raw: TestCaseResult<FunctionTestCaseRunInfo>[],
  problem: Problem
): (TestCaseResult<FunctionTestCaseRunInfo> & { testCase?: TestCase })[] {
  const registry = TestCaseRegistry.instance();
  return raw.map((r) => {
    // Hidden results arrive as bare { success, testCaseInfo: { public: false } }
    // entries by design — they carry no model to hydrate and no details to
    // display, so pass them through untouched.
    if (!r.testCaseInfo.public) return r;
    try {
      // public results carry the full model as testCaseInfo
      const testCase = registry.from(r.testCaseInfo as ProblemTestCase, problem);
      return 'runInfo' in r ? { ...r, testCase, runInfo: testCase.hydrateRunInfo(r.runInfo) } : { ...r, testCase };
    } catch (error) {
      console.error(error);
      return r;
    }
  });
}

/**
 * The error behind a non-2xx response.
 *
 * `fetch` only rejects on network failure, so every 4xx/5xx has to be raised by
 * hand -- without this the body's absent `results` reaches `hydrateResults` and
 * throws there instead, far from the cause. `$lib/response` sends `{ error }`,
 * whose value is a string for hand-written failures and a zod issue object for a
 * rejected body, so only the string form is worth showing.
 */
async function failure(response: Response, action: string): Promise<Error> {
  let detail = `${response.status} ${response.statusText}`.trim();
  try {
    const body = await response.json();
    if (typeof body?.error === 'string') detail = body.error;
  } catch {
    // Not JSON -- a proxy error page, say. The status line is all there is.
  }
  return new Error(`${action}: ${detail}`);
}

export async function runTestCases(session_id: string, problem: Problem): Promise<TestRunResponse> {
  const req = await fetch(`/api/practice-session/${session_id}/run`, {
    method: 'POST',
    body: JSON.stringify({
      test_type: 'public'
    }),
    headers: {
      'content-type': 'application/json'
    }
  });

  if (!req.ok) throw await failure(req, 'Could not run your code');

  const res = await req.json();

  return {
    success: res.success,
    results: hydrateResults(res.results, problem)
  };
}

export async function submit(session_id: string, problem: Problem): Promise<TestRunResponse> {
  const req = await fetch(`/api/practice-session/${session_id}/run`, {
    method: 'POST',
    body: JSON.stringify({
      test_type: 'all'
    }),
    headers: {
      'content-type': 'application/json'
    }
  });

  if (!req.ok) throw await failure(req, 'Could not submit your code');

  const res = (await req.json()) as TestRunResponse;

  return {
    success: res.success,
    results: hydrateResults(res.results, problem),
    recorded: res.recorded
  };
}

export type CustomRunResponse = {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
};

export async function runCustomInput(session_id: string, stdin: string): Promise<CustomRunResponse> {
  const req = await fetch(`/api/practice-session/${session_id}/custom-run`, {
    method: 'POST',
    body: JSON.stringify({ stdin }),
    headers: {
      'content-type': 'application/json'
    }
  });

  if (!req.ok) throw await failure(req, 'Could not run your code');

  const res = await req.json();
  return res as CustomRunResponse;
}
