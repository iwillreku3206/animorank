export function problemSetsHref(user: { type?: 'student' | 'teacher' | null } | null | undefined): string {
  return user?.type === 'teacher' ? '/instructor/problemSets' : '/problemSets';
}

export function problemHref(problemId: string): string {
  return `/problem/${problemId}`;
}

export function problemSetHref(problemSetId: string): string {
  return `/problemSets/${problemSetId}`;
}

export function problemEditHref(problemId: string): string {
  return `/edit/${problemId}`;
}

export function problemSetHrefFor(
  user: { type?: 'student' | 'teacher' | null } | null | undefined,
  problemSetId: string
): string {
  return user?.type === 'teacher' ? `/instructor/problemSets/${problemSetId}` : problemSetHref(problemSetId);
}
