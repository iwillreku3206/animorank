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
});
