import type {
  SessionLogDocument,
  SessionLogEntry,
  SessionLogProblem,
  SessionLogProblemSet
} from '$lib/analytics/sessionLogView';

export interface SessionLogsViewData {
  logs: SessionLogEntry[];
  problem: SessionLogProblem | null;
  problemSet: SessionLogProblemSet | null;
  document: SessionLogDocument | null;
}

/**
 * What every log view is constructed with: the selected session's entries, the
 * problem (and problem set) they belong to, and the slot-aware document behind
 * them. The page replaces the data when the selection changes, so a mounted
 * view re-renders instead of being rebuilt. Nothing here is null only when the
 * page has no session selected.
 */
export class SessionLogsViewContext {
  public logs = $state<SessionLogEntry[]>([]);
  public problem = $state<SessionLogProblem | null>(null);
  public problemSet = $state<SessionLogProblemSet | null>(null);
  public document = $state<SessionLogDocument | null>(null);

  /**
   * Brings one log view's tab forward, building its window if the page has not
   * built it yet. The page assigns this once its tab strip exists; a plugin
   * answering `onSessionLogsLoad` uses it to open the view it contributes.
   */
  public openView: (_key: string) => Promise<void> = async () => {};

  constructor(initial: SessionLogsViewData) {
    this.setData(initial);
  }

  /** Replace the selection's data; mounted views re-render from it. */
  public setData(next: SessionLogsViewData): void {
    this.logs = next.logs;
    this.problem = next.problem;
    this.problemSet = next.problemSet;
    this.document = next.document;
  }
}
