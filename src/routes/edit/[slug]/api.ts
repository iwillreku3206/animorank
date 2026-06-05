import type {
  CustomTestCase,
  FunctionOutputTestCase,
  Language,
  ProblemTestCase,
  ProblemTestCaseType,
  ProgramIOTestCase
} from '$lib/zenstack/models';

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

export async function deleteTestCase(testCaseId: string) {
  await fetch(`/api/test-case/${testCaseId}`, {
    method: 'DELETE'
  });
}

export async function createTestCase(
  problem: string,
  type: ProblemTestCaseType
): Promise<ProblemTestCase | undefined> {
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

type AnyTestCase = ProblemTestCase | FunctionOutputTestCase | ProgramIOTestCase | CustomTestCase;
export async function updateTestCase(testCase: AnyTestCase): Promise<boolean> {
  let body;
  switch (testCase.type) {
    case 'FunctionOutputTestCase': {
      const functionTestCase = testCase as FunctionOutputTestCase;
      body = {
        parameters: functionTestCase.parameters,
        comparisons: functionTestCase.comparisons,
        return_type: functionTestCase.return_type,
        function_name: functionTestCase.function_name
      };
      break;
    }
    case 'ProgramIOTestCase': {
      const ioTestCase = testCase as ProgramIOTestCase;
      body = {
        input: ioTestCase.input,
        output: ioTestCase.output
      };
      break;
    }
    case 'CustomTestCase': {
      const customTestCase = testCase as CustomTestCase;
      body = {
        test_code: customTestCase.test_code
      };
      break;
    }
  }

  const req = await fetch(`/api/test-case/${testCase.id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json'
    }
  });

  const res = await req.json();
  return res.status === 'Success';
}
