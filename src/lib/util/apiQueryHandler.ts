/**
 * Client for an app API that answers JSON queries: one handler per API base.
 * Answers are memoized — including "the API knows of nothing" — so a request
 * that keeps missing does not keep asking. A request that failed, or that the
 * API refused, is not an answer: only a body and a 404 are remembered, so a
 * transient failure (offline, a server restarting, a session that is not
 * signed in yet) can still be answered by the next call instead of looking
 * like "nothing is there" for the rest of the session.
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
   * when the API knows of nothing (a 404) or the request did not get through —
   * the caller treats both as "no answer", but only the first is remembered.
   */
  public query(route: string, params: Record<string, string>): Promise<Record<string, unknown> | undefined> {
    const url = `${this.base}/${route}?${new URLSearchParams(params)}`;
    const known = this.pending.get(url);
    if (known) return known;

    const query = this.fetchBody(url).then((result) => {
      // A request that was not answered may be answerable later, so its entry
      // goes with it; callers that arrived while it was in flight still share
      // the one request, and the next call asks again.
      if (!result.answered) this.pending.delete(url);
      return result.body;
    });
    this.pending.set(url, query);
    return query;
  }

  private async fetchBody(url: string): Promise<{ answered: boolean; body?: Record<string, unknown> }> {
    try {
      const response = await fetch(url);
      // "The API knows of nothing" is an answer. Any other refusal or failure
      // (signed out, unavailable) is not, so it stays retryable.
      if (response.status === 404) return { answered: true };
      if (!response.ok) return { answered: false };
      return { answered: true, body: (await response.json()) as Record<string, unknown> };
    } catch {
      // Offline, DNS failure, a body that is not JSON: not an answer.
      return { answered: false };
    }
  }
}
