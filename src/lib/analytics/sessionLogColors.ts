import type { SessionLogEntry } from './sessionLogView';

/**
 * The categorical scale a session's entry types are drawn in, in the order the
 * colours are handed out.
 *
 * The theme itself only offers four hues far enough apart to tell at a glance
 * (and two of those are greens), while a session can log nine types — so the
 * scale is anchored on the theme's accent and then walks the hue circle at a
 * fixed lightness and chroma chosen to read on this theme's dark panels. Keeping
 * the anchor a theme token means a re-themed build still starts from its own
 * accent; the rest is a chart scale, which no theme provides.
 */
export const TYPE_COLORS = [
  'var(--color-primary)',
  'oklch(0.80 0.16 250)',
  'oklch(0.82 0.16 60)',
  'oklch(0.74 0.18 22)',
  'oklch(0.80 0.15 195)',
  'oklch(0.76 0.17 310)',
  'oklch(0.84 0.15 95)',
  'oklch(0.78 0.16 165)',
  'oklch(0.72 0.18 340)',
  'oklch(0.82 0.14 215)',
  'oklch(0.70 0.17 285)',
  'oklch(0.88 0.14 130)'
] as const;

/**
 * One colour per distinct entry type of a session, keyed by type and handed out
 * in the order the types first appear — so every type in a session is a
 * different colour, a type keeps its colour while a playhead moves, and every
 * view of the same session draws a type the same way.
 *
 * Pass `entries` oldest first, the order the session recorded them in: the
 * assignment is an order, not a hash, because a hash cannot promise two types
 * that happen to collide stay apart in the one view a reader is looking at.
 * A session with more types than the scale has colours wraps around; a legend
 * is what names them.
 */
export function typeColors(entries: SessionLogEntry[]): Map<string, string> {
  const colors = new Map<string, string>();
  for (const entry of entries) {
    if (colors.has(entry.type)) continue;
    colors.set(entry.type, TYPE_COLORS[colors.size % TYPE_COLORS.length]);
  }
  return colors;
}

/** The colour of one type in a session whose {@link typeColors} are known. */
export function colorOf(colors: Map<string, string>, type: string): string {
  return colors.get(type) ?? 'currentColor';
}
