import { describe, expect, it } from 'vitest';
import { ServerAnimoRankAPI } from '$lib/api/server';
import { Server } from '$lib/server';
import HealthcheckServerPlugin from './server';

describe('healthcheck plugin', () => {
  it('answers its route with OK in plaintext', async () => {
    // Initialize the plugin exactly as the loader does, then mount whatever it
    // registered, so the test covers the same path a request takes.
    await new HealthcheckServerPlugin().init(new ServerAnimoRankAPI('healthcheck'));
    const app = await new Server().prepareApp();

    const response = await app.inject({ method: 'GET', url: '/plugin-api/healthcheck/healthcheck' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('text/plain');
    expect(response.body).toBe('OK');
  });
});
