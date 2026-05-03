/**
 *  Mock environment variables and database
 *  (We only care that the TestCase class interacts with the database
 *  and Judge0 API correctly, so we mock those out)
 */

vi.mock('$env/static/private', () => ({
	JUDGE0_BASE_URL: 'http://mock-judge0'
}));

vi.mock('$lib/zenstack', () => ({
	db: {
		problemTestCase: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			deleteMany: vi.fn()
		},
		functionOutputTestCase: {
			create: vi.fn(),
			update: vi.fn()
		},
		programIOTestCase: {
			create: vi.fn(),
			update: vi.fn()
		},
		customTestCase: {
			create: vi.fn(),
			update: vi.fn()
		}
	}
}));

global.fetch = vi.fn() as Mock;

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { TestCase } from './testCase';
import type { ProblemTestCase, FunctionOutputTestCase, ProgramIOTestCase, CustomTestCase } from '../../../zenstack/models';
import { db } from '$lib/zenstack';

describe('TestCase', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('TestCase.for()', () => {
		it('should return FunctionOutputTestCaseHandler for FunctionOutputTestCase', () => {
			const tc: Partial<FunctionOutputTestCase> = { type: 'FunctionOutputTestCase', id: '1' };
			const handler = TestCase.for(tc as ProblemTestCase);
			expect(handler.constructor.name).toBe('FunctionOutputTestCaseHandler');
		});

		it('should return ProgramIOTestCaseHandler for ProgramIOTestCase', () => {
			const tc: Partial<ProgramIOTestCase> = { type: 'ProgramIOTestCase', id: '1' };
			const handler = TestCase.for(tc as ProblemTestCase);
			expect(handler.constructor.name).toBe('ProgramIOTestCaseHandler');
		});

		it('should return CustomTestCaseHandler for CustomTestCase', () => {
			const tc: Partial<CustomTestCase> = { type: 'CustomTestCase', id: '1' };
			const handler = TestCase.for(tc as ProblemTestCase);
			expect(handler.constructor.name).toBe('CustomTestCaseHandler');
		});

		it('should throw error for unknown type', () => {
			const tc: Partial<ProblemTestCase> = { type: 'Unknown' as any, id: '1' };
			expect(() => TestCase.for(tc as ProblemTestCase)).toThrow('Unknown test case type: Unknown');
		});
	});

	describe('TestCase.create()', () => {
		it('should create FunctionOutputTestCase', async () => {
			const mockResult = { id: '1', type: 'FunctionOutputTestCase' };
			vi.mocked(db.functionOutputTestCase.create).mockResolvedValue(mockResult);

			const result = await TestCase.create('FunctionOutputTestCase', 'problem-1');
			expect(vi.mocked(db.functionOutputTestCase.create)).toHaveBeenCalledWith({
				data: { problem_id: 'problem-1' }
			});
			expect(result).toEqual(mockResult);
		});

		it('should create ProgramIOTestCase', async () => {
			const mockResult = { id: '2', type: 'ProgramIOTestCase' };
			vi.mocked(db.programIOTestCase.create).mockResolvedValue(mockResult);

			const result = await TestCase.create('ProgramIOTestCase', 'problem-1');
			expect(vi.mocked(db.programIOTestCase.create)).toHaveBeenCalledWith({
				data: { problem_id: 'problem-1' }
			});
			expect(result).toEqual(mockResult);
		});

		it('should create CustomTestCase', async () => {
			const mockResult = { id: '3', type: 'CustomTestCase' };
			vi.mocked(db.customTestCase.create).mockResolvedValue(mockResult);

			const result = await TestCase.create('CustomTestCase', 'problem-1');
			expect(vi.mocked(db.customTestCase.create)).toHaveBeenCalledWith({
				data: { problem_id: 'problem-1' }
			});
			expect(result).toEqual(mockResult);
		});
	});

	describe('TestCase.findByProblem()', () => {
		it('should return test cases for a problem', async () => {
			const mockResult = [{ id: '1', type: 'FunctionOutputTestCase' }];
			vi.mocked(db.problemTestCase.findMany).mockResolvedValue(mockResult);

			const result = await TestCase.findByProblem('problem-1');
			expect(vi.mocked(db.problemTestCase.findMany)).toHaveBeenCalledWith({
				where: { problem_id: 'problem-1' }
			});
			expect(result).toEqual(mockResult);
		});
	});

	describe('TestCase.findById()', () => {
		it('should return a test case by id', async () => {
			const mockResult = { id: '1', type: 'FunctionOutputTestCase' };
			vi.mocked(db.problemTestCase.findUnique).mockResolvedValue(mockResult);

			const result = await TestCase.findById('1');
			expect(vi.mocked(db.problemTestCase.findUnique)).toHaveBeenCalledWith({
				where: { id: '1' }
			});
			expect(result).toEqual(mockResult);
		});

		it('should return null if not found', async () => {
			vi.mocked(db.problemTestCase.findUnique).mockResolvedValue(null);

			const result = await TestCase.findById('nonexistent');
			expect(result).toBeNull();
		});
	});

	describe('TestCase.delete()', () => {
		it('should delete a test case', async () => {
			const mockResult = { count: 1 };
			vi.mocked(db.problemTestCase.deleteMany).mockResolvedValue(mockResult);

			const result = await TestCase.delete('1');
			expect(vi.mocked(db.problemTestCase.deleteMany)).toHaveBeenCalledWith({
				where: { id: '1' }
			});
			expect(result).toEqual(mockResult);
		});
	});

	describe('FunctionOutputTestCaseHandler', () => {
		let handler: TestCase<ProblemTestCase, unknown>;
		let testCase: FunctionOutputTestCase;

		beforeEach(() => {
			testCase = {
				id: '1',
				type: 'FunctionOutputTestCase',
				problem_id: 'problem-1',
				function_name: 'add',
				parameters: [{ base: 'INT', value: '1' }, { base: 'INT', value: '2' }],
				expected_output: { base: 'INT', value: '3' },
				operator: 'EQUAL'
			} as FunctionOutputTestCase;
			handler = TestCase.for(testCase);
		});

		describe('update()', () => {
			it('should update the test case', async () => {
				const data = { function_name: 'multiply' };
				await handler.update('1', data);
				expect(vi.mocked(db.functionOutputTestCase.update)).toHaveBeenCalledWith({
					where: { id: '1' },
					data
				});
			});
		});

		describe('execute()', () => {
			it('should handle successful execution', async () => {
				const mockResponse = {
					status: { id: 3 },
					stdout: Buffer.from('1\n3\n').toString('base64')
				};
				vi.mocked(global.fetch).mockResolvedValue({
					json: () => Promise.resolve(mockResponse)
				});

				const result = await handler.execute('int add(int a, int b) { return a + b; } int main() { return 0; }');
				expect(result.success).toBe(true);
				expect(result.run_info).toEqual({ actual: '3', expected: '3' });
			});

			it('should handle compile error', async () => {
				const mockResponse = {
					status: { id: 6 },
					compile_output: Buffer.from('error').toString('base64')
				};
				vi.mocked(global.fetch).mockResolvedValue({
					json: () => Promise.resolve(mockResponse)
				});

				const result = await handler.execute('invalid code');
				expect(result.success).toBe(false);
				expect(result.error_reason?.type).toBe('compile_error');
			});

			it('should handle runtime error', async () => {
				const mockResponse = {
					status: { id: 4 }
				};
				vi.mocked(global.fetch).mockResolvedValue({
					json: () => Promise.resolve(mockResponse)
				});

				const result = await handler.execute('void main() { int* p = 0; *p = 1; }');
				expect(result.success).toBe(false);
				expect(result.error_reason?.type).toBe('runtime_error');
			});

			it('should handle incorrect output', async () => {
				const mockResponse = {
					status: { id: 3 },
					stdout: Buffer.from('0\n4\n').toString('base64')
				};
				vi.mocked(global.fetch).mockResolvedValue({
					json: () => Promise.resolve(mockResponse)
				});

				const result = await handler.execute('int add(int a, int b) { return a + b; } int main() { return 0; }');
				expect(result.success).toBe(false);
				expect(result.error_reason?.type).toBe('incorrect_response');
			});
		});
	});

	describe('ProgramIOTestCaseHandler', () => {
		let handler: TestCase<ProblemTestCase, unknown>;
		let testCase: ProgramIOTestCase;

		beforeEach(() => {
			testCase = {
				id: '2',
				type: 'ProgramIOTestCase',
				problem_id: 'problem-1',
				input: '1 2\n',
				output: '3\n'
			} as ProgramIOTestCase;
			handler = TestCase.for(testCase);
		});

		describe('update()', () => {
			it('should update the test case', async () => {
				const data = { input: '2 3\n' };
				await handler.update('2', data);
				expect(vi.mocked(db.programIOTestCase.update)).toHaveBeenCalledWith({
					where: { id: '2' },
					data
				});
			});
		});

		describe('execute()', () => {
			it('should handle successful execution', async () => {
				const mockResponse = {
					status: { id: 3 },
					stdout: Buffer.from('3\n').toString('base64')
				};
				vi.mocked(global.fetch).mockResolvedValue({
					json: () => Promise.resolve(mockResponse)
				});

				const result = await handler.execute('#include <stdio.h>\nint main() { int a, b; scanf("%d %d", &a, &b); printf("%d\\n", a + b); return 0; }');
				expect(result.success).toBe(true);
				expect(result.run_info).toEqual({ actual: '3\n', expected: '3\n' });
			});

			it('should handle incorrect output', async () => {
				const mockResponse = {
					status: { id: 3 },
					stdout: Buffer.from('4\n').toString('base64')
				};
				vi.mocked(global.fetch).mockResolvedValue({
					json: () => Promise.resolve(mockResponse)
				});

				const result = await handler.execute('#include <stdio.h>\nint main() { printf("4\\n"); return 0; }');
				expect(result.success).toBe(false);
				expect(result.error_reason?.type).toBe('incorrect_response');
			});
		});
	});

	describe('CustomTestCaseHandler', () => {
		let handler: TestCase<ProblemTestCase, unknown>;
		let testCase: CustomTestCase;

		beforeEach(() => {
			testCase = {
				id: '3',
				type: 'CustomTestCase',
				problem_id: 'problem-1',
				test_code: 'int main() { return 0; }'
			} as CustomTestCase;
			handler = TestCase.for(testCase);
		});

		describe('update()', () => {
			it('should update the test case', async () => {
				const data = { test_code: 'int main() { return 1; }' };
				await handler.update('3', data);
				expect(vi.mocked(db.customTestCase.update)).toHaveBeenCalledWith({
					where: { id: '3' },
					data
				});
			});
		});

		describe('execute()', () => {
			it('should handle successful execution', async () => {
				const mockResponse = {
					status: { id: 3 }
				};
				vi.mocked(global.fetch).mockResolvedValue({
					json: () => Promise.resolve(mockResponse)
				});

				const result = await handler.execute('int add(int a, int b) { return a + b; }');
				expect(result.success).toBe(true);
			});

			it('should handle runtime error', async () => {
				const mockResponse = {
					status: { id: 4 }
				};
				vi.mocked(global.fetch).mockResolvedValue({
					json: () => Promise.resolve(mockResponse)
				});

				const result = await handler.execute('invalid code');
				expect(result.success).toBe(false);
				expect(result.error_reason?.type).toBe('runtime_error');
			});
		});
	});
});

