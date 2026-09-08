/**
 * Where "your problem sets" should go for a given user.
 *
 * Teachers land on the instructor list, which is where problem sets are created
 * and problems are encoded — the student browse page is a detour for them. The
 * student page stays reachable by URL, so this is a default, not a restriction.
 *
 * Typed structurally rather than against `User`: the `type` field is declared on
 * `Session['user']`, and callers hold one shape or the other.
 */
export function problemSetsHref(user: { type?: 'student' | 'teacher' | null } | null | undefined): string {
  return user?.type === 'teacher' ? '/instructor/problemSets' : '/problemSets';
}
