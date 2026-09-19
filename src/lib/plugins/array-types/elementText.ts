import type { Type } from '$lib/testCase/builtin/functionTestCase/type.svelte';

/**
 * The wire form of one array element: its text.
 *
 * Elements cross the harness boundary as text, and a pointer's element is its
 * pointee's value, so the text is whatever the innermost scalar holds.
 */
export function elementText(element: unknown): string {
  if (element === null || element === undefined) return '';
  if (typeof element !== 'object') return String(element);
  return 'value' in element ? elementText(element.value) : '';
}

/**
 * The element's own value shape with `text` in its innermost scalar, so a
 * nested editor edits the element the way its type expects: a pointer's value
 * is its pointee's value, not the text itself.
 */
export function elementValue(shape: unknown, text: string): unknown {
  if (shape === null || typeof shape !== 'object') return text;
  return 'value' in shape ? { ...shape, value: elementValue(shape.value, text) } : text;
}

/** A fresh element value for `type`, carrying `text` on the wire. */
export function elementValueOf(type: Type, text: string): unknown {
  return elementValue(type.defaultValue().value, text);
}
