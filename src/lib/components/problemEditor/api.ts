import type {
  CustomTestCase,
  FunctionOutputTestCase,
  Problem,
  ProblemTestCase,
  ProblemTestCaseType,
  ProgramIOTestCase
} from '$lib/zenstack/models';

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

export async function deleteTestCase(id: string): Promise<boolean> {
  const req = await fetch(`/api/test-case/${id}`, {
    method: 'DELETE'
  });

  const res = await req.json();

  return res.status === 'Success';
}

export async function updateProblem(problem: Problem): Promise<boolean> {
  const req = await fetch(`/api/problem/${problem.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: problem.name,
      description: problem.description,
      visible: problem.visible,
      starter_code: problem.starter_code
    }),
    headers: {
      'content-type': 'application/json'
    }
  });

  const res = await req.json();

  return res.status === 'success';
}

type AnyTestCase = ProblemTestCase | FunctionOutputTestCase | ProgramIOTestCase | CustomTestCase;
export async function updateTestCase(testCase: AnyTestCase): Promise<boolean> {
  let body;
  switch (testCase.type) {
    case 'FunctionOutputTestCase':
      const functionTestCase = testCase as FunctionOutputTestCase;
      body = {
        parameters: functionTestCase.parameters,
        expected_output: functionTestCase.expected_output,
        operator: functionTestCase.operator,
        function_name: functionTestCase.function_name
      };
      break;
    case 'ProgramIOTestCase':
      const ioTestCase = testCase as ProgramIOTestCase;
      body = {
        input: ioTestCase.input,
        output: ioTestCase.output
      };
      break;
    case 'CustomTestCase':
      const customTestCase = testCase as CustomTestCase;
      body = {
        test_code: customTestCase.test_code
      };
      break;
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
