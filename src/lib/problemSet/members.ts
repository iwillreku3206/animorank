/** The two kinds of account a problem set grants access to. */
export type MemberRole = 'student' | 'teacher';

/** One member of a problem set, as the editor's tabs list them. */
export interface MemberInfo {
  /** The account's id, which is also its student/teacher row id. */
  id: string;
  name: string | null;
  email: string;
}

/** The registered account an address resolved to, as the lookup describes it. */
export interface MemberCandidate {
  id: string;
  email: string;
  name: string | null;
  isStudent: boolean;
  isTeacher: boolean;
}

/** Why an address could not be added as a member of the requested kind. */
export type MemberRejection = 'unknown-email' | 'not-a-student' | 'not-a-teacher';

/** The message the editor shows for each rejection. */
export const MEMBER_REJECTION_MESSAGES: Record<MemberRejection, string> = {
  'unknown-email': 'No account is registered with that email address.',
  'not-a-student': 'That account is not a student account.',
  'not-a-teacher': 'That account is not a teacher account.'
};

/**
 * An address as it is looked up: trimmed and lowercased, so `Ada@Example.com `
 * still finds the account it names. The lookup itself is case-insensitive too —
 * this only keeps what is compared and echoed back consistent.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Whether a looked-up account may join a problem set in `role`.
 *
 * The account has to exist — an unregistered address is the error the editor
 * reports — and it has to be of the right kind: a subscription is a row joining
 * `Student` and a collaboration one joining `Teacher`, so a teacher account can
 * be a collaborator but never a subscriber, and the other way round.
 */
export function resolveMember(
  candidate: MemberCandidate | null,
  role: MemberRole
): { ok: true; member: MemberInfo } | { ok: false; reason: MemberRejection } {
  if (!candidate) return { ok: false, reason: 'unknown-email' };

  const hasRole = role === 'student' ? candidate.isStudent : candidate.isTeacher;
  if (!hasRole) return { ok: false, reason: role === 'student' ? 'not-a-student' : 'not-a-teacher' };

  return {
    ok: true,
    member: { id: candidate.id, name: candidate.name, email: candidate.email }
  };
}
