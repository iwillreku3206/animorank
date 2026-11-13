import type { Entry } from './telemetryHook';
import { TelemetryService } from './telemetryService';

/** A collated entry plus the moment it was captured. */
interface PendingEntry {
  entry: Entry;
  timestamp: Date;
}

/**
 * How often the buffered queue is checked, in seconds.
 *
 * Constant for now. One second: an entry is worth recording promptly — the
 * history is the raw material of the session replay — and a closed tab takes
 * whatever was still buffered with it.
 */
export const FLUSH_INTERVAL_SECONDS = 1;

/**
 * Records telemetry entries into the practice session's history
 * (`/api/updateHistory`): entries are buffered as they arrive and written out
 * in one batch.
 *
 * Two things send a batch. A poll checks the queue every
 * {@link FLUSH_INTERVAL_SECONDS} and posts it when it holds anything, so an
 * idle page costs one comparison per interval and no traffic. An explicit
 * {@link flush} from the app posts immediately, which is what keeps an entry
 * caused by a save, run or submit from waiting for the next tick.
 *
 * The request is best-effort — a failed batch is dropped with a warning
 * rather than retried, so an offline client cannot accumulate an unbounded
 * buffer.
 */
export class SessionHistoryTelemetryService extends TelemetryService {
  private pending: PendingEntry[] = [];

  /**
   * Set while a batch is in flight. A tick that lands mid-request stands down:
   * the next one carries what has been buffered since, instead of posting a
   * second batch on top of the first.
   */
  private flushing = false;

  /** Handle for the poll, for {@link dispose} to stop. */
  private readonly poll = setInterval(() => void this.flushIfPending(), FLUSH_INTERVAL_SECONDS * 1000);

  /** Stop polling. The page calls this as it unmounts. */
  public override dispose(): void {
    clearInterval(this.poll);
  }

  protected telemetryCallback(entry: Entry): void {
    this.pending.push({ entry, timestamp: new Date() });
  }

  /** One poll: post whatever has accumulated since the last batch. */
  private async flushIfPending(): Promise<void> {
    if (this.flushing || this.pending.length === 0) return;
    await this.flush();
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

    this.flushing = true;
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
    } finally {
      this.flushing = false;
    }
  }
}
