const PARENT_ORDER = ['set', 'problem', 'user', 'session'];

/**
 * The logs-page URL after one picker changes: `value` sets or clears `key`, and
 * changing a parent level clears every level below it, so a stale child can
 * never survive its parent. `type` is orthogonal and always survives.
 */
export function selectionHref(pathname: string, current: URLSearchParams, key: string, value: string): string {
  const params = new URLSearchParams(current);
  if (value) params.set(key, value);
  else params.delete(key);
  const index = PARENT_ORDER.indexOf(key);
  if (index >= 0) {
    for (const child of PARENT_ORDER.slice(index + 1)) params.delete(child);
  }
  const qs = params.toString();
  return `${pathname}${qs ? `?${qs}` : ''}`;
}
