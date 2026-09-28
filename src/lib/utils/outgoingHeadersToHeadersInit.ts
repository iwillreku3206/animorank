import type { OutgoingHttpHeaders } from 'node:http';

export function outgoingHeadersToHeadersInit(outgoing: OutgoingHttpHeaders): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(outgoing)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, String(item));
      }
    } else {
      headers.set(key, String(value));
    }
  }

  return headers;
}
