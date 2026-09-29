import { describe, expect, it } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { readUuidParam } from './params';

/** The 404 the loader throws, or `null` when the parameter was accepted. */
function rejection(value: string): unknown {
  try {
    readUuidParam(value);
    return null;
  } catch (error) {
    return error;
  }
}

describe('readUuidParam', () => {
  it('accepts a UUID and returns it unchanged', () => {
    const uuid = '50a25b39-6a14-4d34-aed3-53275ebb3a6f';

    expect(readUuidParam(uuid)).toBe(uuid);
    expect(readUuidParam(uuid.toUpperCase())).toBe(uuid.toUpperCase());
  });

  it('answers a non-UUID path segment with a 404, not a failed query', () => {
    // Devtools and browsers request paths like this against the page origin;
    // without the guard the segment reaches a `uuid` column and the request
    // surfaces as a 500.
    for (const value of ['installHook.js.map', 'not-a-uuid', '1', '', 'favicon.ico']) {
      const error = rejection(value);
      expect(isHttpError(error, 404)).toBe(true);
    }
  });

  it('does not accept a UUID with extra text around it', () => {
    for (const value of [
      '50a25b39-6a14-4d34-aed3-53275ebb3a6f/extra',
      '50a25b39-6a14-4d34-aed3-53275ebb3a6f.map',
      ' 50a25b39-6a14-4d34-aed3-53275ebb3a6f'
    ]) {
      expect(isHttpError(rejection(value), 404)).toBe(true);
    }
  });
});
