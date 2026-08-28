import type { TestCaseResult } from '$lib/testCase/types';
import type { FunctionTestCaseRunInfo } from '$lib/testCase/builtin/functionTestCase/functionTestCase.svelte';
import { GlobalRegistryProvider } from '$lib/registry/global';
import { TestCaseRegistry } from '$lib/testCase/testCaseRegistry';
import type { TestCase } from '$lib/testCase/testCase.svelte';
import type { Problem } from '$lib/problem';
import type { ProblemTestCase } from '$lib/zenstack/models';

export type TestRunResponse = {
  results: (TestCaseResult<FunctionTestCaseRunInfo> & { testCase?: TestCase })[];
  success: boolean;
};

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

  const res = (await req.json()) as TestRunResponse;

  return {
    success: res.success,
    results: await hydrateResults(res.results, problem)
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

  const res = await req.json();
  return res as CustomRunResponse;
}
