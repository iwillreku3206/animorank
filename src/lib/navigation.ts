export function problemSetsHref(user: { type?: 'student' | 'teacher' | null } | null | undefined): string {
  return user?.type === 'teacher' ? '/instructor/problemSets' : '/problemSets';
}

export function problemHref(problemId: string): string {
  return `/problem/${problemId}`;
}

export function problemSetHref(problemSetId: string): string {
  return `/problemSets/${problemSetId}`;
}
