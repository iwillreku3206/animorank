import type { Entry } from './telemetryHook';
import { TelemetryService } from './telemetryService';

/** A collated entry plus the moment it was captured. */
interface PendingEntry {
  entry: Entry;
  timestamp: Date;
}

/**
 * Records telemetry entries into the practice session's history
 * (`/api/updateHistory`): entries are buffered as they arrive and written out
 * in one batch when {@link flush} is called. The app calls flush when the
 * session is saved, so history traffic rides on the session's existing save
 * cadence instead of its own timer.
 *
 * The request is best-effort — a failed batch is dropped with a warning
 * rather than retried, so an offline client cannot accumulate an unbounded
 * buffer.
 */
export class SessionHistoryTelemetryService extends TelemetryService {
  private pending: PendingEntry[] = [];

  protected telemetryCallback(entry: Entry): void {
    this.pending.push({ entry, timestamp: new Date() });
  }

  /** Post every collated entry for this session in one request. */
  public override async flush(): Promise<void> {
    const batch = this.pending.splice(0, this.pending.length);
    if (batch.length === 0) return;

    const events = batch.map(({ entry, timestamp }) => ({
      session_id: this.sessionId,
      timestamp,
      type: entry.type,
      data: entry.data
    }));

    try {
      const response = await fetch('/api/updateHistory', {
        method: 'POST',
        body: JSON.stringify(events),
        headers: {
          'content-type': 'application/json'
        }
      });
      if (!response.ok) {
        console.warn(`Failed to record session history batch: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to record session history batch', error);
    }
  }
}
