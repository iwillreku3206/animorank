import type { FilterStatus, SortType } from '$lib/problemSet/problemSetService';

/**
 * Allowed sort keys and statuses, enumerated once here. The `satisfies` guards
 * keep these arrays in sync with the domain types in problemSetService at
 * compile time — adding a value there forces a value here (and vice versa).
 */
export const SORT_TYPES = [
  'problems_solved',
  'problem_count',
  'completion_pct',
  'difficulty'
] as const satisfies readonly SortType[];

export const STATUSES = ['not_started', 'in_progress', 'complete'] as const satisfies readonly FilterStatus[];

export type SortBy = SortType | '';
export type Status = FilterStatus;

/** Human-readable labels for each completion status, used by the filter chips. */
export const STATUS_LABELS: Record<Status, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete'
};

export type TagFilterState = 'include' | 'exclude';

export interface Filters {
  /** Included tag ids (subjects, difficulties, topics). */
  include: string[];
  /** Excluded tag ids — topics only (subject/difficulty are single-valued, so excludes are redundant). */
  exclude: string[];
  topicMatchAll: boolean;
  /** Selected completion statuses, OR-ed together. */
  statuses: Status[];
  /** Selected creator (user) ids. OR-ed by default, AND-ed when creatorMatchAll. */
  creators: string[];
  creatorMatchAll: boolean;
  bookmarked: boolean;
}
