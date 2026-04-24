import { testFunctionTestCase } from '$lib/codeExecutor/functionTestCase';
import { successObject } from '$lib/response';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  await testFunctionTestCase(
    {
      function_name: 'square',
      created_at: new Date(),
      expected_output: { base: 'INT', value: '9' },
      id: Math.random().toString(),
      operator: 'EQUAL',
      parameters: [{ base: 'INT', value: '3' }],
      problem_id: 'some problem lol',
      public: false,
      type: 'FunctionOutputTestCase',
      updated_at: new Date()
    },
    `
int square(int x) {
  return x * x + 1;
}
    `
  );
  return successObject({ ok: true });
};
