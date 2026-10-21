import { describe, expect, it } from 'vitest';
import { MEMBER_REJECTION_MESSAGES, normalizeEmail, resolveMember, type MemberCandidate } from './members';

const account = (overrides: Partial<MemberCandidate> = {}): MemberCandidate => ({
  id: 'user-1',
  email: 'ada@example.com',
  name: 'Ada',
  isStudent: true,
  isTeacher: false,
  ...overrides
});

const teacher = (overrides: Partial<MemberCandidate> = {}) =>
  account({
    id: 'teacher-1',
    email: 'grace@example.com',
    name: 'Grace',
    isStudent: false,
    isTeacher: true,
    ...overrides
  });

describe('normalizeEmail', () => {
  it('trims and lowercases, so a typed address still names its account', () => {
    expect(normalizeEmail('  Ada@Example.COM ')).toBe('ada@example.com');
    expect(normalizeEmail('ada@example.com')).toBe('ada@example.com');
  });

  it('leaves an empty address empty, for the caller to reject', () => {
    expect(normalizeEmail('   ')).toBe('');
  });
});

describe('resolveMember', () => {
  it('accepts a registered student as a subscriber', () => {
    expect(resolveMember(account(), 'student')).toEqual({
      ok: true,
      member: { id: 'user-1', name: 'Ada', email: 'ada@example.com' }
    });
  });

  it('accepts a registered teacher as a collaborator', () => {
    expect(resolveMember(teacher(), 'teacher')).toEqual({
      ok: true,
      member: { id: 'teacher-1', name: 'Grace', email: 'grace@example.com' }
    });
  });

  it('rejects an address no account is registered with, in either role', () => {
    expect(resolveMember(null, 'student')).toEqual({ ok: false, reason: 'unknown-email' });
    expect(resolveMember(null, 'teacher')).toEqual({ ok: false, reason: 'unknown-email' });
  });

  it('refuses a teacher account as a subscriber', () => {
    expect(resolveMember(teacher(), 'student')).toEqual({ ok: false, reason: 'not-a-student' });
  });

  it('refuses a student account as a collaborator', () => {
    expect(resolveMember(account(), 'teacher')).toEqual({ ok: false, reason: 'not-a-teacher' });
  });

  it('has a message per rejection, so a tab never shows a bare code', () => {
    expect(Object.keys(MEMBER_REJECTION_MESSAGES).sort()).toEqual(['not-a-student', 'not-a-teacher', 'unknown-email']);
    for (const message of Object.values(MEMBER_REJECTION_MESSAGES)) expect(message.length).toBeGreaterThan(10);
  });
});
