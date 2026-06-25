import type { Filters, SortBy, TagFilterState } from './api';
import { SORT_TYPES, STATUSES } from './api';

/** Whether a tag is currently included, excluded, or neither. */
export function tagState(filters: Filters, id: string): TagFilterState | null {
  if (filters.include.includes(id)) return 'include';
  if (filters.exclude.includes(id)) return 'exclude';
  return null;
}

/** Advance a tag through the cycle: none → include → exclude → none. */
export function cycleTag(filters: Filters, id: string): void {
  const state = tagState(filters, id);
  filters.include = filters.include.filter((t) => t !== id);
  filters.exclude = filters.exclude.filter((t) => t !== id);
  if (state === null) filters.include = [...filters.include, id];
  else if (state === 'include') filters.exclude = [...filters.exclude, id];
}

/**
 * Toggle a tag's include state: none → include → none. Used for single-valued
 * categories (subject, difficulty) where excluding is redundant.
 */
export function toggleInclude(filters: Filters, id: string): void {
  if (filters.include.includes(id)) {
    filters.include = filters.include.filter((t) => t !== id);
  } else {
    filters.exclude = filters.exclude.filter((t) => t !== id);
    filters.include = [...filters.include, id];
  }
}

/** Toggle a plain value in/out of a string-array filter (statuses, creators). */
export function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Remove a tag from both include and exclude. */
export function removeTag(filters: Filters, id: string): void {
  filters.include = filters.include.filter((t) => t !== id);
  filters.exclude = filters.exclude.filter((t) => t !== id);
}

/** How many of the given tag ids are selected (included or excluded). */
export function selectionCount(filters: Filters, tagIds: string[]): number {
  return tagIds.filter((id) => filters.include.includes(id) || filters.exclude.includes(id)).length;
}

/** Whether any filter (tags, status, creator, bookmark) is active. */
export function hasAnyFilter(filters: Filters): boolean {
  return (
    filters.include.length > 0 ||
    filters.exclude.length > 0 ||
    filters.statuses.length > 0 ||
    filters.creators.length > 0 ||
    filters.bookmarked
  );
}

/** Deep-copy a Filters object so callers can mutate a draft without touching the source. */
export function cloneFilters(f: Filters): Filters {
  return {
    include: [...f.include],
    exclude: [...f.exclude],
    topicMatchAll: f.topicMatchAll,
    statuses: [...f.statuses],
    creators: [...f.creators],
    creatorMatchAll: f.creatorMatchAll,
    bookmarked: f.bookmarked
  };
}

export function emptyFilters(): Filters {
  return {
    include: [],
    exclude: [],
    topicMatchAll: false,
    statuses: [],
    creators: [],
    creatorMatchAll: false,
    bookmarked: false
  };
}

/**
 * Parse the filter portion of a query string. Used by both the page (to seed
 * client state) and the server load (to query) so the wire format is defined once.
 */
export function parseFilters(params: URLSearchParams): Filters {
  const statuses = params
    .getAll('status')
    .filter((s): s is Filters['statuses'][number] => (STATUSES as readonly string[]).includes(s));
  return {
    include: params.getAll('tag'),
    exclude: params.getAll('extag'),
    topicMatchAll: params.get('topicMatch') === 'all',
    statuses,
    creators: params.getAll('creator'),
    creatorMatchAll: params.get('creatorMatch') === 'all',
    bookmarked: params.get('bookmarked') === 'true'
  };
}

/** Parse the sort portion of a query string. */
export function parseSort(params: URLSearchParams): { by: SortBy; desc: boolean } {
  const by = params.get('sortBy') ?? '';
  return {
    by: (SORT_TYPES as readonly string[]).includes(by) ? (by as SortBy) : '',
    desc: params.get('sortOrder') === 'desc'
  };
}

/** Everything reflected into the URL on the problem sets page. */
export interface QueryState {
  filters: Filters;
  search: string;
  sortBy: SortBy;
  sortDesc: boolean;
  viewMode: string;
  pageNumber: number;
}

/** Serialize the full page query state to a query string (no leading '?'). */
export function serializeQuery(state: QueryState): string {
  const params = new URLSearchParams();
  for (const id of state.filters.include) params.append('tag', id);
  for (const id of state.filters.exclude) params.append('extag', id);
  if (state.filters.topicMatchAll) params.set('topicMatch', 'all');
  for (const status of state.filters.statuses) params.append('status', status);
  for (const id of state.filters.creators) params.append('creator', id);
  if (state.filters.creatorMatchAll) params.set('creatorMatch', 'all');
  if (state.filters.bookmarked) params.set('bookmarked', 'true');
  if (state.search) params.set('search', state.search);
  if (state.sortBy) params.set('sortBy', state.sortBy);
  if (state.sortDesc) params.set('sortOrder', 'desc');
  if (state.viewMode === 'list') params.set('viewMode', 'list');
  if (state.pageNumber !== 1) params.set('page', String(state.pageNumber));
  return params.toString();
}
