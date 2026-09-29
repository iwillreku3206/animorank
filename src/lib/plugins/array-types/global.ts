/**
 * Wire format for array values crossing the gcc harness boundary.
 *
 * An array is written to one file as its elements separated by a unit
 * separator (U+001F), with a record separator (U+001E) terminating the list.
 * Both are control characters, so an element cannot forge an extra element by
 * containing a separator. Within an element, backslash, the two separators,
 * and the C escapes the harness prints through `printf` are escaped, and
 * decoding reverses exactly that set.
 *
 * Both sides import this module, so the format has exactly one definition.
 */

/** Separates two elements of the encoded list. */
export const ELEMENT_SEPARATOR = '\x1f';

/** Terminates the encoded list. */
export const LIST_TERMINATOR = '\x1e';

const ESCAPES: ReadonlyArray<readonly [string, string]> = [
  ['\\', '\\\\'],
  [ELEMENT_SEPARATOR, '\\x1f'],
  [LIST_TERMINATOR, '\\x1e'],
  ['\n', '\\n'],
  ['\r', '\\r'],
  ['\t', '\\t'],
  ['\x07', '\\a'],
  ['\b', '\\b'],
  ['\f', '\\f'],
  ['\v', '\\v']
];

/** @type {ReadonlyArray<readonly [string, string]>} */
/**
 * Escape one element so it can be embedded in the encoded list.
 */
export function escapeElement(element: string): string {
  let out = '';
  for (const character of element) {
    const escape = ESCAPES.find(([raw]) => raw === character);
    if (escape) {
      out += escape[1];
      continue;
    }
    const code = character.codePointAt(0) ?? 0;
    // Other control characters would be ambiguous once printed; hex escapes
    // keep them reversible.
    out += code < 0x20 || code === 0x7f ? `\\x${code.toString(16).padStart(2, '0')}` : character;
  }
  return out;
}

const HEX_PAIR = /^[0-9a-fA-F]{2}$/;

/**
 * Decode one element written by {@link escapeElement}.
 *
 * Total by construction: a program's printed text is not guaranteed to be a
 * string this module produced, so an escape that cannot be decoded is kept as
 * the characters it is, never dropped and never thrown on.
 */
export function unescapeElement(element: string): string {
  let out = '';
  for (let index = 0; index < element.length; index += 1) {
    const character = element[index];
    if (character !== '\\') {
      out += character;
      continue;
    }
    const next = element[index + 1];
    if (next === undefined) {
      // A lone trailing backslash is data, not an incomplete escape.
      out += character;
      continue;
    }
    index += 1;
    if (next === 'x' && HEX_PAIR.test(element.slice(index + 1, index + 3))) {
      out += String.fromCodePoint(Number.parseInt(element.slice(index + 1, index + 3), 16));
      index += 2;
      continue;
    }
    const escape = ESCAPES.find(([, escaped]) => escaped === `\\${next}`);
    out += escape ? escape[0] : character + next;
  }
  return out;
}

/** The separators as literal characters in generated source; octal cannot absorb a following digit. */
export const C_ELEMENT_SEPARATOR = '\\037';

export const C_LIST_TERMINATOR = '\\036';

/**
 * The whole encoded list for the given elements. Every element is terminated,
 * so an empty list (`RS`) and a list holding one empty element (`US RS`) stay
 * distinguishable.
 */
export function encodeList(elements: readonly string[]): string {
  return elements.map((element) => escapeElement(element) + ELEMENT_SEPARATOR).join('') + LIST_TERMINATOR;
}

/**
 * The elements of an encoded list; output without a terminator yields an empty list.
 */
export function decodeList(encoded: string): string[] {
  if (!encoded.endsWith(LIST_TERMINATOR)) return [];
  const body = encoded.slice(0, -LIST_TERMINATOR.length);
  if (body === '') return [];
  return body.slice(0, -ELEMENT_SEPARATOR.length).split(ELEMENT_SEPARATOR).map(unescapeElement);
}
