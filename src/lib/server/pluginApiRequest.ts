import { outgoingHeadersToHeadersInit } from '$lib/utils/outgoingHeadersToHeadersInit';
import type { RequestEvent } from '@sveltejs/kit';
import { PLUGIN_API_PREFIX, type ServerApp } from './index';

/** Whether a request path names a plugin API: the prefix itself, or a path under it. */
export function isPluginApiPath(pathname: string): boolean {
  return pathname === PLUGIN_API_PREFIX || pathname.startsWith(`${PLUGIN_API_PREFIX}/`);
}

/**
 * Framing and connection headers describe the hop a message travelled on, not
 * the injected hop the bridge creates, so neither direction copies them.
 */
const HOP_BY_HOP_HEADERS: readonly string[] = [
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'upgrade',
  'te',
  'trailer'
];

/**
 * The request headers the bridge never forwards: the body crosses as the bytes
 * the client sent, so its length is recomputed for the injected request
 * instead of being copied from the original one.
 */
const UNFORWARDED_REQUEST_HEADERS: readonly string[] = [...HOP_BY_HOP_HEADERS, 'content-length'];

/** Statuses whose response carries no body; `Response` refuses a non-null body for these. */
const NULL_BODY_STATUSES: readonly number[] = [101, 204, 205, 304];

// mirror since fastify doesnt export this type
type HTTPMethods =
  | 'DELETE'
  | 'delete'
  | 'GET'
  | 'get'
  | 'HEAD'
  | 'head'
  | 'PATCH'
  | 'patch'
  | 'POST'
  | 'post'
  | 'PUT'
  | 'put'
  | 'OPTIONS'
  | 'options';

/**
 * Injects one plugin-API request into the app and returns what the plugin
 * answered. The body crosses as bytes in both directions — light-my-request's
 * `body` is a lossy UTF-8 decode of the payload, `rawPayload` is the payload —
 * and the caller's address travels with the request, so a plugin's
 * `request.ip` is the client rather than the inject default.
 */
export async function injectPluginApiRequest(app: ServerApp, event: RequestEvent): Promise<Response> {
  const method = event.request.method;

  let payload: Buffer | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    payload = Buffer.from(await event.request.arrayBuffer());
  }

  const headers: Record<string, string> = {};
  event.request.headers.forEach((value, name) => {
    if (!UNFORWARDED_REQUEST_HEADERS.includes(name)) headers[name] = value;
  });

  // A deployment can be told to read the client address from a header
  // (`ADDRESS_HEADER`), and `getClientAddress()` throws when that header is
  // missing. The address only fills light-my-request's `remoteAddress`, so a
  // request without one still goes through.
  let remoteAddress: string | undefined;
  try {
    remoteAddress = event.getClientAddress();
  } catch {
    remoteAddress = undefined;
  }

  const injected = await app.inject({
    method: method as HTTPMethods,
    url: event.url.pathname + event.url.search,
    headers,
    payload,
    remoteAddress
  });

  const headersInit = outgoingHeadersToHeadersInit(injected.headers);
  for (const name of HOP_BY_HOP_HEADERS) headersInit.delete(name);

  // A null-body status takes no body at all; every other one takes the bytes
  // the plugin sent, which `content-length` (from Fastify's byte count) matches.
  //
  // The copy is what the body type accepts: a `Buffer`, or a view over its
  // buffer, is typed `ArrayBufferLike`, which `BodyInit` rejects.
  const body = NULL_BODY_STATUSES.includes(injected.statusCode) ? null : new Uint8Array(injected.rawPayload);

  return new Response(body, { status: injected.statusCode, headers: headersInit });
}
