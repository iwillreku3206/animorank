/** What the analytics pages need to know about the signed-in user. */
export interface AnalyticsViewer {
  type?: 'student' | 'teacher';
  admin?: boolean;
}

/**
 * Whether a user may see the analytics pages.
 *
 * Analytics is a view across every class in the course, so being a teacher is
 * not enough: a teacher account reaches it only with the operator flag set.
 * A student never does, flag or not — the flag is meaningless without a
 * teacher record, and this refuses rather than trusting one.
 */
export function canViewAnalytics(viewer: AnalyticsViewer | null | undefined): boolean {
  return viewer?.type === 'teacher' && viewer.admin === true;
}
