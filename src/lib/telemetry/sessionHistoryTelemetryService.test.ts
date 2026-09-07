import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionHistoryTelemetryService } from './sessionHistoryTelemetryService';
import type { Entry } from './telemetryHook';

const SESSION_ID = '123e4567-e89b-42d3-a456-426614174000';

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

describe('SessionHistoryTelemetryService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('buffers entries until flush posts them to the session history in one batch', async () => {
    const service = new TestSessionHistoryService(SESSION_ID);

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
    const service = new TestSessionHistoryService(SESSION_ID);

    await service.flush();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts entries that arrive after a flush on the next flush', async () => {
    const service = new TestSessionHistoryService(SESSION_ID);

    service.emit({ type: 'PING', data: {} });
    await service.flush();
    service.emit({ type: 'PING', data: { second: true } });
    await service.flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondEvents = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string) as unknown[];
    expect(secondEvents).toMatchObject([{ session_id: SESSION_ID, type: 'PING', data: { second: true } }]);
  });

  it('drops the batch with a warning instead of throwing when the request fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const service = new TestSessionHistoryService(SESSION_ID);
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    service.emit({ type: 'PING', data: {} });
    await expect(service.flush()).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
