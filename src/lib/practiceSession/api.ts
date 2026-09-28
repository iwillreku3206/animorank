import type { TestCaseResult } from '$lib/testCase/types';
import type { FunctionTestCaseRunInfo } from '$lib/testCase/builtin/functionTestCase/functionTestCase.svelte';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
import type { TestCase } from '$lib/testCase/testCase.svelte';
import type { Problem } from '$lib/problem';
import type { ProblemTestCase } from '$lib/zenstack/models';
import type { JsonValue } from '@zenstackhq/orm';
import { errorFrom } from '$lib/response';

export type TestRunResponse = {
  results: (TestCaseResult<FunctionTestCaseRunInfo> & { testCase?: TestCase })[];
  success: boolean;
  recorded?: boolean;
};

export interface PracticeSessionUpdate {
  /** The session's code, keyed by slot label. */
  code?: Record<string, string>;
  /** Keys to write into the session's extension data; merged with what is stored. */
  extension_data?: JsonValue;
}

/**
 * Persist what the session should hold: the code the student has written, an
 * extension's own data, or both. Only what is passed is touched.
 *
 * Rejects when the write does not land, so a caller that is about to act on the
 * server's copy of the session -- run, submit -- never mistakes a failed save
 * for a successful one. `fetch` only rejects on network failure, so a 4xx/5xx
 * has to be raised by hand.
 */
export async function savePracticeSession(sessionId: string, updates: PracticeSessionUpdate): Promise<void> {
  const response = await fetch(`/api/practice-session/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
    headers: { 'content-type': 'application/json' }
  });
  if (!response.ok) throw await errorFrom(response, 'Could not save your session');
}

async function hydrateResults(
  raw: TestCaseResult<FunctionTestCaseRunInfo>[],
  problem: Problem
): Promise<(TestCaseResult<FunctionTestCaseRunInfo> & { testCase?: TestCase })[]> {
  const registry = GlobalRegistryProvider.instance().getRegistry(TestCaseRegistry);
  return Promise.all(
    raw.map(async (r) => {
      // Hidden results arrive as bare { success, testCaseInfo: { public: false } }
      // entries by design — they carry no model to hydrate and no details to
      // display, so pass them through untouched.
      if (!r.testCaseInfo.public) return r;
      try {
        // public results carry the full model as testCaseInfo
        const testCase = await registry.from(r.testCaseInfo as ProblemTestCase, problem);
        return 'runInfo' in r
          ? { ...r, testCase, runInfo: await testCase.hydrateRunInfo(r.runInfo) }
          : { ...r, testCase };
      } catch (error) {
        console.error(error);
        return r;
      }
    })
  );
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

  if (!req.ok) throw await errorFrom(req, 'Could not run your code');

  const res = await req.json();

  return {
    success: res.success,
    results: await hydrateResults(res.results, problem)
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

  if (!req.ok) throw await errorFrom(req, 'Could not submit your code');

  const res = (await req.json()) as TestRunResponse;

  return {
    success: res.success,
    results: await hydrateResults(res.results, problem),
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

  if (!req.ok) throw await errorFrom(req, 'Could not run your code');

  const res = await req.json();
  return res as CustomRunResponse;
}
