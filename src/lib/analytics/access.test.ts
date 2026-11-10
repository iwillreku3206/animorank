import { describe, expect, it } from 'vitest';
import { canViewAnalytics } from './access';

describe('canViewAnalytics', () => {
  it('admits a teacher carrying the operator flag', () => {
    expect(canViewAnalytics({ type: 'teacher', admin: true })).toBe(true);
  });

  it('refuses a teacher without the flag', () => {
    expect(canViewAnalytics({ type: 'teacher', admin: false })).toBe(false);
    expect(canViewAnalytics({ type: 'teacher' })).toBe(false);
  });

  it('refuses a student, whatever the flag says', () => {
    expect(canViewAnalytics({ type: 'student', admin: true })).toBe(false);
    expect(canViewAnalytics({ type: 'student' })).toBe(false);
  });

  it('refuses nobody at all', () => {
    expect(canViewAnalytics(null)).toBe(false);
    expect(canViewAnalytics(undefined)).toBe(false);
  });

  it('needs a real boolean, not anything truthy', () => {
    // The flag arrives from the database row, so a truthy-but-not-true value
    // means something is wrong upstream, not that access was granted.
    expect(canViewAnalytics({ type: 'teacher', admin: 'yes' as unknown as boolean })).toBe(false);
  });
});
