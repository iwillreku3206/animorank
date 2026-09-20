export const error = (status: number, message: string | object) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' }
  });

export const successObject = (object: object) =>
  new Response(JSON.stringify(object), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });

export async function errorFrom(response: Response, action: string): Promise<Error> {
  let detail = `${response.status} ${response.statusText}`.trim();
  try {
    const body = await response.json();
    if (typeof body?.error === 'string') detail = body.error;
    else if (typeof body?.message === 'string') detail = body.message;
  } catch {
    // Not JSON -- a proxy error page, say. The status line is all there is.
  }
  return new Error(`${action}: ${detail}`);
}
