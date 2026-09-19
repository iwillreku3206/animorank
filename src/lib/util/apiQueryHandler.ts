/**
 * Client for an app API that answers JSON queries: one handler per API base.
 * Answers are memoized — including "the API knows of nothing" — so a request
 * that keeps missing does not keep asking.
 */
export class ApiQueryHandler {
  private readonly base: string;
  private readonly pending = new Map<string, Promise<Record<string, unknown> | undefined>>();

  /** @param base URL of the API, e.g. `/api/plugin`; routes are queried relative to it. */
  public constructor(base: string) {
    this.base = base;
  }

  /**
   * The API's JSON body for one route with its query parameters. `undefined`
   * when the API knows of nothing (a 404) or the request fails — the caller
   * treats both as "no answer".
   */
  public query(route: string, params: Record<string, string>): Promise<Record<string, unknown> | undefined> {
    const url = `${this.base}/${route}?${new URLSearchParams(params)}`;
    const known = this.pending.get(url);
    if (known) return known;

    const query = this.fetchBody(url);
    this.pending.set(url, query);
    return query;
  }

  private async fetchBody(url: string): Promise<Record<string, unknown> | undefined> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return undefined;
      }
      return (await response.json()) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
}
