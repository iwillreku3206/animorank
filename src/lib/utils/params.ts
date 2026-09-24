import { error } from '@sveltejs/kit';

/** A canonical UUID, as Postgres `uuid` columns accept it. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A path parameter that has to be a UUID.
 *
 * Routes are reachable with anything: a browser or a devtool can request paths
 * like `/edit/installHook.js.map`, and the parameter then flows into a query
 * against a `uuid` column, where Postgres rejects it and the request surfaces
 * as a 500. Checking the shape first turns those into the 404 they are.
 *
 * @param value the raw path parameter
 * @param message optional message for the 404
 */
export function readUuidParam(value: string, message = 'Not Found'): string {
  if (!UUID.test(value)) throw error(404, { message });
  return value;
}
