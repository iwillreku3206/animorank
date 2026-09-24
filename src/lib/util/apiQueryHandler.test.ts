import { describe, expect, it, vi } from 'vitest';
import { ApiQueryHandler } from './apiQueryHandler';

describe('ApiQueryHandler', () => {
  it('reports what the API returns and counts a 404 as no answer', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        calls.push(url);
        return url.includes('/known?')
          ? new Response(JSON.stringify({ answer: 1 }), { status: 200 })
          : new Response('no', { status: 404 });
      })
    );

    try {
      const api = new ApiQueryHandler('/api/thing');

      await expect(api.query('known', { id: 'a' })).resolves.toEqual({ answer: 1 });
      await expect(api.query('unknown', { id: 'b' })).resolves.toBeUndefined();
      expect(calls).toEqual(['/api/thing/known?id=a', '/api/thing/unknown?id=b']);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('answers a repeated query from memory, including "knows of nothing"', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        calls.push(String(input));
        return new Response('no', { status: 404 });
      })
    );

    try {
      const api = new ApiQueryHandler('/api/thing');

      await expect(api.query('registry', { id: 'a' })).resolves.toBeUndefined();
      await expect(api.query('registry', { id: 'a' })).resolves.toBeUndefined();
      expect(calls).toEqual(['/api/thing/registry?id=a']);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('counts a failed request as no answer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      })
    );

    try {
      await expect(new ApiQueryHandler('/api/thing').query('registry', { id: 'a' })).resolves.toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('asks again after a request that was not answered, so a transient failure is not final', async () => {
    const calls: string[] = [];
    let attempt = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        calls.push(String(input));
        attempt += 1;
        // Offline first, answered second: the same query, the same handler.
        if (attempt === 1) throw new Error('offline');
        return new Response(JSON.stringify({ answer: 'second try' }), { status: 200 });
      })
    );

    try {
      const api = new ApiQueryHandler('/api/thing');

      await expect(api.query('registry', { id: 'a' })).resolves.toBeUndefined();
      await expect(api.query('registry', { id: 'a' })).resolves.toEqual({ answer: 'second try' });
      expect(calls).toEqual(['/api/thing/registry?id=a', '/api/thing/registry?id=a']);

      // The answer that did arrive is remembered, like any other.
      await expect(api.query('registry', { id: 'a' })).resolves.toEqual({ answer: 'second try' });
      expect(calls).toHaveLength(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('asks again after the API refuses, but not after it says it knows nothing', async () => {
    const calls: string[] = [];
    const statuses = [403, 404];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        calls.push(String(input));
        return new Response('no', { status: statuses.shift() ?? 404 });
      })
    );

    try {
      const api = new ApiQueryHandler('/api/thing');

      // Refused (not signed in yet): not an answer, so asking again is allowed.
      await expect(api.query('registry', { id: 'a' })).resolves.toBeUndefined();
      await expect(api.query('registry', { id: 'a' })).resolves.toBeUndefined();
      expect(calls).toHaveLength(2);

      // 404 is the API saying it knows of nothing: an answer, asked once.
      await expect(api.query('other', { id: 'b' })).resolves.toBeUndefined();
      await expect(api.query('other', { id: 'b' })).resolves.toBeUndefined();
      expect(calls).toHaveLength(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
