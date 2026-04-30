/**
 * Tests for the test-case/[id] API route handlers.
 *
 * We mock the database and TestCase class so we can verify
 * that the ownership check works correctly without a real DB.
 */

vi.mock('$lib/zenstack', () => ({
	db: {
		problemTestCase: {
			findUnique: vi.fn()
		}
	}
}));

vi.mock('$lib/codeExecutor/testCase', () => ({
	TestCase: {
		delete: vi.fn(),
		for: vi.fn(() => ({
			update: vi.fn()
		}))
	}
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE, PUT } from './+server';
import { db } from '$lib/zenstack';
import { TestCase } from '$lib/codeExecutor/testCase';

type RouteEvent = Parameters<typeof DELETE>[0];

/** Helper to build a fake SvelteKit RequestEvent */
function fakeEvent(overrides: {
	userId?: string | null;
	paramId?: string;
	body?: unknown;
}) {
	return {
		locals: {
			auth: vi.fn().mockResolvedValue(
				overrides.userId ? { user: { id: overrides.userId } } : null
			)
		},
		params: { id: overrides.paramId ?? 'tc-1' },
		request: {
			json: vi.fn().mockResolvedValue(overrides.body ?? {})
		}
	} as unknown as RouteEvent;
}

const OWNER_ID = 'owner-user-id';
const OTHER_USER_ID = 'other-user-id';

const ownedTestCase = {
	id: 'tc-1',
	type: 'ProgramIOTestCase' as const,
	problem_id: 'problem-1',
	public: true,
	input: '',
	output: '',
	created_at: new Date(),
	updated_at: new Date()
};

describe('DELETE /api/test-case/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return 403 when not authenticated', async () => {
		const event = fakeEvent({ userId: null, paramId: 'tc-1' });
		const response = await DELETE(event);
		expect(response.status).toBe(403);
	});

	it('should return 404 when user does not own the test case', async () => {
		vi.mocked(db.problemTestCase.findUnique).mockResolvedValue(null);

		const event = fakeEvent({ userId: OTHER_USER_ID, paramId: 'tc-1' });
		const response = await DELETE(event);

		expect(response.status).toBe(404);
		expect(vi.mocked(db.problemTestCase.findUnique)).toHaveBeenCalledWith({
			where: {
				id: 'tc-1',
				problem: { problem_set: { owner_id: OTHER_USER_ID } }
			}
		});
		// Ensure delete was never called
		expect(vi.mocked(TestCase.delete)).not.toHaveBeenCalled();
	});

	it('should delete and return 200 when user owns the test case', async () => {
		vi.mocked(db.problemTestCase.findUnique).mockResolvedValue(ownedTestCase);
		vi.mocked(TestCase.delete).mockResolvedValue({ count: 1 });

		const event = fakeEvent({ userId: OWNER_ID, paramId: 'tc-1' });
		const response = await DELETE(event);

		expect(response.status).toBe(200);
		expect(vi.mocked(TestCase.delete)).toHaveBeenCalledWith('tc-1');
	});
});

describe('PUT /api/test-case/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return 403 when not authenticated', async () => {
		const event = fakeEvent({ userId: null, paramId: 'tc-1' });
		const response = await PUT(event);
		expect(response.status).toBe(403);
	});

	it('should return 404 when user does not own the test case', async () => {
		vi.mocked(db.problemTestCase.findUnique).mockResolvedValue(null);

		const event = fakeEvent({
			userId: OTHER_USER_ID,
			paramId: 'tc-1',
			body: { input: 'x', output: 'y' }
		});
		const response = await PUT(event);

		expect(response.status).toBe(404);
		expect(vi.mocked(db.problemTestCase.findUnique)).toHaveBeenCalledWith({
			where: {
				id: 'tc-1',
				problem: { problem_set: { owner_id: OTHER_USER_ID } }
			}
		});
	});

	it('should update and return 200 when user owns the test case', async () => {
		vi.mocked(db.problemTestCase.findUnique).mockResolvedValue(ownedTestCase);

		const mockUpdate = vi.fn();
		vi.mocked(TestCase.for).mockReturnValue({ update: mockUpdate } as unknown as ReturnType<typeof TestCase.for>);

		const body = { input: 'new input', output: 'new output' };
		const event = fakeEvent({ userId: OWNER_ID, paramId: 'tc-1', body });
		const response = await PUT(event);

		expect(response.status).toBe(200);
		expect(mockUpdate).toHaveBeenCalledWith('tc-1', body);
	});

	it('should return 400 when body fails validation', async () => {
		vi.mocked(db.problemTestCase.findUnique).mockResolvedValue(ownedTestCase);

		// ProgramIOTestCase expects { input: string, output: string }
		const body = { invalid_field: 123 };
		const event = fakeEvent({ userId: OWNER_ID, paramId: 'tc-1', body });
		const response = await PUT(event);

		expect(response.status).toBe(400);
	});
});
