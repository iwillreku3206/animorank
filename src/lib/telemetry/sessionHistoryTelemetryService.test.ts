import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FLUSH_INTERVAL_SECONDS, SessionHistoryTelemetryService } from './sessionHistoryTelemetryService';
import type { Entry } from './telemetryHook';

const SESSION_ID = '123e4567-e89b-42d3-a456-426614174000';
const INTERVAL_MS = FLUSH_INTERVAL_SECONDS * 1000;

/** Exposes the protected callback so tests can emit entries directly. */
class TestSessionHistoryService extends SessionHistoryTelemetryService {
  public emit(entry: Entry): void {
    this.telemetryCallback(entry);
  }
}

function postedEvents(fetchMock: ReturnType<typeof vi.fn>): unknown[] {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(init.body as string) as unknown[];
}

/** Events of the call at `index`, as posted. */
function eventsOfCall(fetchMock: ReturnType<typeof vi.fn>, index: number): unknown[] {
  return JSON.parse((fetchMock.mock.calls[index][1] as RequestInit).body as string) as unknown[];
}

describe('SessionHistoryTelemetryService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  /** Every service a test built, so no poll outlives the test that started it. */
  let services: SessionHistoryTelemetryService[];

  const build = (): TestSessionHistoryService => {
    const service = new TestSessionHistoryService(SESSION_ID);
    services.push(service);
    return service;
  };

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', fetchMock);
    services = [];
  });

  afterEach(() => {
    for (const service of services) service.dispose();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('buffers entries until flush posts them to the session history in one batch', async () => {
    const service = build();

    service.emit({ type: 'TEXT_MODIFIED', data: { new: 'a' } });
    service.emit({ type: 'RUN_ATTEMPT', data: { success: false } });
    expect(fetchMock).not.toHaveBeenCalled();

    await service.flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/updateHistory');
    const events = postedEvents(fetchMock);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ session_id: SESSION_ID, type: 'TEXT_MODIFIED', data: { new: 'a' } });
    expect(events[1]).toMatchObject({ session_id: SESSION_ID, type: 'RUN_ATTEMPT', data: { success: false } });
    for (const event of events as { timestamp: string }[]) {
      expect(Number.isNaN(Date.parse(event.timestamp))).toBe(false);
    }

    // The buffer is drained: a second flush has nothing to post.
    await service.flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does nothing when flush is called with no buffered entries', async () => {
    const service = build();

    await service.flush();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts entries that arrive after a flush on the next flush', async () => {
    const service = build();

    service.emit({ type: 'PING', data: {} });
    await service.flush();
    service.emit({ type: 'PING', data: { second: true } });
    await service.flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(eventsOfCall(fetchMock, 1)).toMatchObject([
      { session_id: SESSION_ID, type: 'PING', data: { second: true } }
    ]);
  });

  it('drops the batch with a warning instead of throwing when the request fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const service = build();
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    service.emit({ type: 'PING', data: {} });
    await expect(service.flush()).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('posts the buffered entries by itself once the interval elapses', async () => {
    vi.useFakeTimers();
    const service = build();

    service.emit({ type: 'TEXT_MODIFIED', data: { new: 'a' } });
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(INTERVAL_MS - 1);
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(postedEvents(fetchMock)).toMatchObject([{ session_id: SESSION_ID, type: 'TEXT_MODIFIED' }]);
  });

  it('posts nothing while the queue is empty', async () => {
    vi.useFakeTimers();
    build();

    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 5);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stands down while a batch is still in flight, then posts what arrived after it', async () => {
    vi.useFakeTimers();
    let release: (response: Response) => void = () => {};
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        })
    );
    const service = build();

    service.emit({ type: 'PING', data: { first: true } });
    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    service.emit({ type: 'PING', data: { second: true } });
    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    release({ ok: true } as Response);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(eventsOfCall(fetchMock, 1)).toMatchObject([{ data: { second: true } }]);
  });

  it('stops polling once disposed', async () => {
    vi.useFakeTimers();
    const service = build();
    service.dispose();

    service.emit({ type: 'PING', data: {} });
    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 5);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
