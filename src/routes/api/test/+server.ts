import { TestCase } from '$lib/codeExecutor/testCase';
import { successObject } from '$lib/response';
import type { RequestHandler } from './$types';
import type { FunctionOutputTestCase } from '../../../../zenstack/models';

const testData: FunctionOutputTestCase = {
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
};

export const GET: RequestHandler = async () => {
	await TestCase.for(testData).execute(`
int square(int x) {
  return x * x + 1;
}
    `);
	return successObject({ ok: true });
};
