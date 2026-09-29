import type { RequestEvent } from '@sveltejs/kit';
import { Readable } from 'node:stream';
import type { FastifyPluginCallback } from 'fastify';
import { beforeAll, describe, expect, it } from 'vitest';
import { ServerRegistryProvider } from '$lib/registry/server';
import { RegistryProviderRegistrar } from '$lib/registry/registryProviderRegistrar';
import { Server, type ServerApp } from '$lib/server';
import { ServerAPIRegistry } from '$lib/server/registry';
import { ServerAPI } from '$lib/server/serverAPI';
import { injectPluginApiRequest, isPluginApiPath } from './pluginApiRequest';

/**
 * The routes the bridge is exercised against: one per kind of answer a plugin
 * can give — a plain body, no body at all, bytes a text decode would mangle, a
 * stream and the request's own address — plus an echo of the request body.
 */
class BridgeTestAPI extends ServerAPI {
  public async fastifyPlugin(): Promise<FastifyPluginCallback> {
    return async (app) => {
      app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (_request, body, done) =>
        done(null, body)
      );
      app.get('/text', async (_request, reply) => reply.type('text/plain').send('OK'));
      app.get('/no-content', async (_request, reply) => reply.code(204).send());
      app.get('/not-modified', async (_request, reply) => reply.code(304).send());
      app.get('/binary', async (_request, reply) =>
        reply.type('application/octet-stream').send(Buffer.from([0xff, 0xfe, 0x41]))
      );
      app.get('/stream', async (_request, reply) => reply.type('text/plain').send(Readable.from(['hello ', 'stream'])));
      app.get('/ip', async (request, reply) => reply.type('text/plain').send(request.ip));
      app.post('/echo', async (request, reply) => {
        const body = request.body as Buffer | string;
        const bytes = typeof body === 'string' ? Buffer.from(body) : body;
        reply.type('text/plain').send(`${bytes.length}:${bytes.toString('hex')}`);
      });
    };
  }
}

let app: ServerApp;

beforeAll(async () => {
  new RegistryProviderRegistrar(ServerRegistryProvider.instance(), 'bridge-test')
    .getRegistrar(ServerAPIRegistry, '')
    .registerSingleton('bridge-test', new BridgeTestAPI());
  app = await new Server().prepareApp();
});

/** A request event as `handle` receives one, with a fixed address. */
function event(method: string, path: string, body?: BodyInit, contentType?: string): RequestEvent {
  const url = new URL(`https://localhost${path}`);
  const request = new Request(url, {
    method,
    body,
    headers: contentType ? { 'content-type': contentType } : undefined
  });

  return { request, url, getClientAddress: () => '203.0.113.7' } as unknown as RequestEvent;
}

describe('injectPluginApiRequest', () => {
  it('answers with what the plugin sent', async () => {
    const response = await injectPluginApiRequest(app, event('GET', '/plugin-api/bridge-test/text'));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/plain');
    await expect(response.text()).resolves.toBe('OK');
  });

  it('answers a status that carries no body instead of throwing', async () => {
    const noContent = await injectPluginApiRequest(app, event('GET', '/plugin-api/bridge-test/no-content'));
    expect(noContent.status).toBe(204);
    await expect(noContent.text()).resolves.toBe('');

    const notModified = await injectPluginApiRequest(app, event('GET', '/plugin-api/bridge-test/not-modified'));
    expect(notModified.status).toBe(304);
    await expect(notModified.text()).resolves.toBe('');
  });

  it('returns binary bytes unchanged, under their own length', async () => {
    const response = await injectPluginApiRequest(app, event('GET', '/plugin-api/bridge-test/binary'));

    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([255, 254, 65]);
    expect(response.headers.get('content-length')).toBe('3');
  });

  it('keeps a streamed body intact and drops its framing header', async () => {
    const response = await injectPluginApiRequest(app, event('GET', '/plugin-api/bridge-test/stream'));

    await expect(response.text()).resolves.toBe('hello stream');
    expect(response.headers.has('transfer-encoding')).toBe(false);
  });

  it('answers a HEAD request with no body', async () => {
    const response = await injectPluginApiRequest(app, event('HEAD', '/plugin-api/bridge-test/text'));

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('');
  });

  it('forwards a binary request body byte for byte', async () => {
    const response = await injectPluginApiRequest(
      app,
      event('POST', '/plugin-api/bridge-test/echo', new Uint8Array([0xff, 0xfe]), 'application/octet-stream')
    );

    await expect(response.text()).resolves.toBe('2:fffe');
  });

  it('forwards a UTF-8 request body unchanged', async () => {
    const response = await injectPluginApiRequest(
      app,
      event('POST', '/plugin-api/bridge-test/echo', 'café', 'text/plain; charset=utf-8')
    );

    await expect(response.text()).resolves.toBe('5:636166c3a9');
  });

  it('tells the plugin which address the request came from', async () => {
    const response = await injectPluginApiRequest(app, event('GET', '/plugin-api/bridge-test/ip'));

    await expect(response.text()).resolves.toBe('203.0.113.7');
  });
});

describe('isPluginApiPath', () => {
  it('matches the prefix itself and every path under it', () => {
    expect(isPluginApiPath('/plugin-api')).toBe(true);
    expect(isPluginApiPath('/plugin-api/healthcheck/healthcheck')).toBe(true);
  });

  it('does not match a path that merely starts with the prefix', () => {
    expect(isPluginApiPath('/plugin-apifoo')).toBe(false);
    expect(isPluginApiPath('/plugin-api-')).toBe(false);
  });
});
